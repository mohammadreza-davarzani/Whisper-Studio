import { execFile } from 'node:child_process'
import type { Dirent } from 'node:fs'
import { readdir, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type {
  DownloadedWhisperModel,
  DownloadedWhisperModelsResult,
  WhisperModelActionResult,
  WhisperModelDownloadProgress
} from '../../../shared/ipc'
import { createScopedCache } from './cache'
import { findPython } from './prerequisites'
import { WHISPER_KNOWN_MODELS, WHISPER_DOWNLOADABLE_IDS } from '../../../shared/constants'

// Known model metadata used to enrich local cache scan results.
// Defined in shared/constants.ts — WHISPER_KNOWN_MODELS.

// Downloadable model IDs defined in shared/constants.ts — WHISPER_DOWNLOADABLE_IDS.

type CommandResult = {
  exitCode: number
  stderr: string
  stdout: string
}

function isKnownDownloadableModel(modelId: string): boolean {
  return WHISPER_DOWNLOADABLE_IDS.includes(modelId)
}

function resolveExitCode(error: unknown): number {
  if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'number') {
    return error.code
  }

  return error ? 1 : 0
}

function getWhisperCacheDir(): string {
  return process.env.WHISPER_CACHE_DIR ?? join(homedir(), '.cache', 'whisper')
}

// Runs a short-lived process and returns normalized output.
function runCommand(
  command: string,
  args: readonly string[],
  timeoutMs = 30 * 60 * 1000
): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(
      command,
      [...args],
      { timeout: timeoutMs, windowsHide: true },
      (error, stdout, stderr) => {
        resolve({
          exitCode: resolveExitCode(error),
          stderr: stderr.trim(),
          stdout: stdout.trim()
        })
      }
    )
  })
}

// Scans the Whisper cache directory for downloaded model files.
async function scanDownloadedModels(): Promise<DownloadedWhisperModelsResult> {
  const cacheDir = getWhisperCacheDir()
  let entries: Dirent<string>[]

  try {
    entries = await readdir(cacheDir, { withFileTypes: true })
  } catch {
    return { models: [], totalSizeBytes: 0 }
  }

  const modelOrder = Object.keys(WHISPER_KNOWN_MODELS)
  const orderByModel = new Map(modelOrder.map((name, index) => [name, index]))
  const models: DownloadedWhisperModel[] = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.pt')) {
      continue
    }

    const modelName = entry.name.slice(0, -3)
    const filePath = join(cacheDir, entry.name)
    const fileStats = await stat(filePath).catch(() => null)

    if (!fileStats) {
      continue
    }

    const info = WHISPER_KNOWN_MODELS[modelName]

    models.push({
      downloadedAt: fileStats.mtimeMs,
      id: modelName,
      languages: '99',
      name: modelName,
      params: info?.params ?? '-',
      path: filePath,
      precision: 'fp32',
      sizeBytes: fileStats.size,
      source: `openai/whisper`
    })
  }

  models.sort((a, b) => {
    const aOrder = orderByModel.get(a.name) ?? 999
    const bOrder = orderByModel.get(b.name) ?? 999
    return aOrder - bOrder
  })

  return {
    models,
    totalSizeBytes: models.reduce((sum, model) => sum + model.sizeBytes, 0)
  }
}

const CACHE_DURATION_MS = 5000
const downloadedModelsCache = createScopedCache(scanDownloadedModels, CACHE_DURATION_MS)

// Returns a short-lived cached view of downloaded models.
export async function getDownloadedModels(): Promise<DownloadedWhisperModelsResult> {
  return downloadedModelsCache.get()
}

// Downloads a model via Python whisper.load_model while emitting progress snapshots.
export async function downloadModel(
  modelId: string,
  emitProgress?: (progress: WhisperModelDownloadProgress) => void
): Promise<WhisperModelActionResult> {
  if (!isKnownDownloadableModel(modelId)) {
    return {
      id: modelId,
      ok: false,
      stderr: 'This model is not in the allowed download list.'
    }
  }

  const python = await findPython()

  if (!python) {
    return {
      id: modelId,
      ok: false,
      stderr: 'Python was not found. Install Python before downloading models.'
    }
  }

  const cacheDir = getWhisperCacheDir()
  const ptPath = join(cacheDir, `${modelId}.pt`)

  const getDownloadedBytes = async (): Promise<number> => {
    const fileStats = await stat(ptPath).catch(() => null)
    return fileStats?.size ?? 0
  }

  const emitCurrentProgress = async (
    state: WhisperModelDownloadProgress['state'] = 'active'
  ): Promise<void> => {
    emitProgress?.({
      downloadedBytes: await getDownloadedBytes(),
      repoId: modelId,
      state
    })
  }

  await emitCurrentProgress()
  const progressInterval = setInterval(() => {
    void emitCurrentProgress()
  }, 750)

  const code = [
    'import whisper, json',
    `whisper.load_model(${JSON.stringify(modelId)}, download_root=${JSON.stringify(cacheDir)})`,
    'print(json.dumps({"ok": True}))'
  ].join('; ')
  const result = await runCommand(python.command, [...python.prefixArgs, '-c', code])

  clearInterval(progressInterval)
  downloadedModelsCache.invalidate()
  await emitCurrentProgress(result.exitCode === 0 ? 'complete' : 'error')

  return {
    id: modelId,
    ok: result.exitCode === 0,
    stderr: result.stderr,
    stdout: result.stdout
  }
}

// Removes a downloaded model file from the local Whisper cache.
export async function deleteModel(id: string): Promise<WhisperModelActionResult> {
  const cacheDir = getWhisperCacheDir()
  const ptPath = join(cacheDir, `${id}.pt`)

  try {
    await rm(ptPath, { force: true })
    downloadedModelsCache.invalidate()
    return { id, ok: true }
  } catch (error) {
    return {
      id,
      ok: false,
      stderr: error instanceof Error ? error.message : 'Failed to delete model file.'
    }
  }
}
