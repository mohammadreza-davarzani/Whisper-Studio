import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { execFile } from 'node:child_process'
import {
  DownloadedWhisperModel,
  IPC_CHANNELS,
  WhisperModelDownloadProgress,
  type DownloadedWhisperModelsResult,
  type WhisperModelActionResult
} from '../../../shared/ipc'
import {
  MODEL_FETCHING_CACHE_DURATION_MS,
  WHISPER_DOWNLOADABLE_IDS,
  WHISPER_KNOWN_MODELS
} from '../../../shared/constants'
import { createScopedCache } from '../../cache'
import { Dirent } from 'original-fs'
import { readdir, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { findPython } from '../command'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

type CommandResult = {
  exitCode: number
  stderr: string
  stdout: string
}

type PythonInfo = {
  command: string
  prefixArgs: string[]
}

// Shared state built up as the download pipeline progresses.
type DownloadContext = {
  modelId: string
  cacheDir: string
  ptPath: string
  python: PythonInfo
  result: CommandResult
}

// ---------------------------------------------------------------------------
// Module-level cache
// ---------------------------------------------------------------------------

const downloadedModelsCache = createScopedCache(
  scanDownloadedModels,
  MODEL_FETCHING_CACHE_DURATION_MS
)

// ---------------------------------------------------------------------------
// IPC registration
// ---------------------------------------------------------------------------

export function registerModelHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.downloadedModels,
    async (): Promise<DownloadedWhisperModelsResult> => {
      return getDownloadedModels()
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.downloadModel,
    async (event: IpcMainInvokeEvent, repoId: string): Promise<WhisperModelActionResult> => {
      return downloadModel(repoId, (progress) => {
        event.sender.send(IPC_CHANNELS.modelDownloadProgress, progress)
      })
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.deleteModel,
    async (_event: IpcMainInvokeEvent, id: string): Promise<WhisperModelActionResult> => {
      return deleteModel(id)
    }
  )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Returns a short-lived cached view of downloaded models.
export async function getDownloadedModels(): Promise<DownloadedWhisperModelsResult> {
  return downloadedModelsCache.get()
}

// ---------------------------------------------------------------------------
// Download pipeline
// ---------------------------------------------------------------------------

export async function downloadModel(
  modelId: string,
  emitProgress?: (progress: WhisperModelDownloadProgress) => void
): Promise<WhisperModelActionResult> {
  const guardResult = validateModelId(modelId)
  if (guardResult) return guardResult

  const python = await resolvePython(modelId)
  if (!isPythonInfo(python)) return python

  const { cacheDir, ptPath } = resolvePaths(modelId)

  const progress = createProgressController(modelId, ptPath, emitProgress)
  await progress.emitCurrent()
  progress.start()

  try {
    const result = await executeDownload(python, modelId, cacheDir)
    downloadedModelsCache.invalidate()
    await progress.emitCurrent(result.exitCode === 0 ? 'complete' : 'error')

    return buildResult({ modelId, cacheDir, ptPath, python, result })
  } finally {
    progress.stop()
  }
}

// ---------------------------------------------------------------------------
// Pipeline steps
// ---------------------------------------------------------------------------

// Step 1: Reject unknown model IDs before touching the filesystem.
function validateModelId(modelId: string): WhisperModelActionResult | null {
  if (!WHISPER_DOWNLOADABLE_IDS.includes(modelId)) {
    return {
      id: modelId,
      ok: false,
      stderr: 'This model is not in the allowed download list.'
    }
  }
  return null
}

// Step 2: Locate the Python binary; returns a failure result if not found.
async function resolvePython(modelId: string): Promise<PythonInfo | WhisperModelActionResult> {
  const python = await findPython()
  if (!python) {
    return {
      id: modelId,
      ok: false,
      stderr: 'Python was not found. Install Python before downloading models.'
    }
  }
  return python
}

function isPythonInfo(value: PythonInfo | WhisperModelActionResult): value is PythonInfo {
  return 'command' in value
}

// Step 3: Derive all filesystem paths needed by the pipeline.
function resolvePaths(modelId: string): { cacheDir: string; ptPath: string } {
  const cacheDir = getWhisperCacheDir()
  const ptPath = join(cacheDir, `${modelId}.pt`)
  return { cacheDir, ptPath }
}

// Step 4+5: Returns a controller that periodically emits download progress.
function createProgressController(
  modelId: string,
  ptPath: string,
  emitProgress: ((progress: WhisperModelDownloadProgress) => void) | undefined
): {
  emitCurrent: (state?: WhisperModelDownloadProgress['state']) => Promise<void>
  start: () => void
  stop: () => void
} {
  let intervalId: ReturnType<typeof setInterval> | undefined

  const getDownloadedBytes = async (): Promise<number> => {
    const fileStats = await stat(ptPath).catch(() => null)
    return fileStats?.size ?? 0
  }

  const emitCurrent = async (
    state: WhisperModelDownloadProgress['state'] = 'active'
  ): Promise<void> => {
    emitProgress?.({
      downloadedBytes: await getDownloadedBytes(),
      repoId: modelId,
      state
    })
  }

  return {
    emitCurrent,
    start: () => {
      intervalId = setInterval(() => {
        void emitCurrent()
      }, 750)
    },
    stop: () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId)
        intervalId = undefined
      }
    }
  }
}

// Step 6+7: Run the Python download script; retries once after fixing certs.
async function executeDownload(
  python: PythonInfo,
  modelId: string,
  cacheDir: string
): Promise<CommandResult> {
  const code = buildDownloadScript(modelId, cacheDir)
  let result = await runCommand(python.command, [...python.prefixArgs, '-c', code])

  if (result.exitCode !== 0 && isCertificateError(result.stderr)) {
    await runCommand(python.command, [
      ...python.prefixArgs,
      '-m',
      'pip',
      'install',
      '--quiet',
      'truststore',
      'certifi'
    ])
    result = await runCommand(python.command, [...python.prefixArgs, '-c', code])
  }

  return result
}

// Step 9: Map the raw command result to a typed action result.
function buildResult(ctx: DownloadContext): WhisperModelActionResult {
  const { modelId, result } = ctx
  const succeeded = result.exitCode === 0
  const hasCertError = isCertificateError(result.stderr)

  return {
    id: modelId,
    ok: succeeded,
    stderr:
      succeeded || !hasCertError
        ? result.stderr
        : `${result.stderr}\n\nTLS certificate verification failed. If you are on a managed or corporate network, make sure Python trusts your system certificates. The app tried to fix this by installing "truststore"; on macOS you can also run the "Install Certificates.command" bundled with your Python installation.`,
    stdout: result.stdout
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWhisperCacheDir(): string {
  return process.env.WHISPER_CACHE_DIR ?? join(homedir(), '.cache', 'whisper')
}

function buildDownloadScript(modelId: string, cacheDir: string): string {
  return [
    'import json',
    'try:',
    '    import truststore',
    '    truststore.inject_into_ssl()',
    'except Exception:',
    '    try:',
    '        import os, certifi',
    '        os.environ.setdefault("SSL_CERT_FILE", certifi.where())',
    '    except Exception:',
    '        pass',
    'import whisper',
    `whisper.load_model(${JSON.stringify(modelId)}, download_root=${JSON.stringify(cacheDir)})`,
    'print(json.dumps({"ok": True}))'
  ].join('\n')
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

// Detects TLS trust failures so the download can self-heal (install truststore + retry).
function isCertificateError(stderr: string): boolean {
  return /CERTIFICATE_VERIFY_FAILED|SSLCertVerificationError|self-signed certificate|unable to get local issuer/i.test(
    stderr
  )
}

function resolveExitCode(error: unknown): number {
  if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'number') {
    return error.code
  }

  return error ? 1 : 0
}

// ---------------------------------------------------------------------------
// Scan / delete
// ---------------------------------------------------------------------------

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
