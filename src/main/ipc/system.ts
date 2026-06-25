import { app, BrowserWindow, ipcMain } from 'electron'
import { execFile } from 'node:child_process'
import { cpus, totalmem } from 'node:os'
import {
  IPC_CHANNELS,
  type AppInfo,
  type DesktopPlatform,
  type PrerequisiteCheck,
  type PrerequisiteCheckId,
  type SystemStatus
} from '../../shared/ipc'

type WindowResolver = () => BrowserWindow | null
type CommandResult = {
  command: string
  output: string
  prefixArgs: string[]
}
type CommandCandidate = {
  args: readonly string[]
  command: string
  prefixArgs?: readonly string[]
  timeoutMs?: number
}

const prerequisiteIds: readonly PrerequisiteCheckId[] = [
  'python',
  'ffmpeg',
  'cuda',
  'faster-whisper',
  'ctranslate2',
  'torch'
]
const prerequisiteCacheDurationMs = 5000
let prerequisiteCache: { checkedAt: number; value: PrerequisiteCheck[] } | null = null
let prerequisiteRequest: Promise<PrerequisiteCheck[]> | null = null

function formatMemory(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024 / 1024)} GB`
}

function runCommand(
  command: string,
  args: readonly string[],
  timeoutMs = 3000
): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      command,
      [...args],
      { timeout: timeoutMs, windowsHide: true },
      (error, stdout, stderr) => {
        const output = `${stdout}${stderr}`.trim()

        if (error && !output) {
          resolve(null)
          return
        }

        resolve(output || null)
      }
    )
  })
}

async function runCommandCandidate(candidates: readonly CommandCandidate[]): Promise<CommandResult | null> {
  for (const candidate of candidates) {
    const prefixArgs = [...(candidate.prefixArgs ?? [])]
    const output = await runCommand(
      candidate.command,
      [...prefixArgs, ...candidate.args],
      candidate.timeoutMs
    )

    if (output) {
      return { command: candidate.command, output, prefixArgs }
    }
  }

  return null
}

function parseVersion(output: string): string | null {
  return output.match(/\d+(?:\.\d+)+(?:[A-Za-z0-9.+-]*)?/)?.[0] ?? null
}

function compareVersions(actual: string, required: readonly number[]): number {
  const actualParts = actual.split(/[^\d]+/).filter(Boolean).map(Number)

  for (let index = 0; index < required.length; index += 1) {
    const actualPart = actualParts[index] ?? 0
    const requiredPart = required[index] ?? 0

    if (actualPart > requiredPart) {
      return 1
    }

    if (actualPart < requiredPart) {
      return -1
    }
  }

  return 0
}

function checkVersion(
  id: PrerequisiteCheckId,
  installed: string | null,
  minimum?: readonly number[]
): PrerequisiteCheck {
  return {
    id,
    installed,
    status: installed && (!minimum || compareVersions(installed, minimum) >= 0) ? 'ok' : 'missing'
  }
}

async function findPython(): Promise<CommandResult | null> {
  const candidates = [
    { command: 'python', args: ['--version'], timeoutMs: 2500 },
    { command: 'python3', args: ['--version'], timeoutMs: 1200 },
    { command: 'py', prefixArgs: ['-3'], args: ['--version'], timeoutMs: 1200 }
  ]

  for (const candidate of candidates) {
    const result = await runCommandCandidate([candidate])

    if (result && parseVersion(result.output)) {
      return result
    }
  }

  return null
}

async function checkPython(): Promise<{ check: PrerequisiteCheck; python: CommandResult | null }> {
  const python = await findPython()
  const installed = python ? parseVersion(python.output) : null

  return { check: checkVersion('python', installed, [3, 8]), python }
}

async function checkCommandVersion(
  id: PrerequisiteCheckId,
  candidates: readonly CommandCandidate[],
  minimum?: readonly number[]
): Promise<PrerequisiteCheck> {
  const result = await runCommandCandidate(candidates)
  const installed = result ? parseVersion(result.output) : null

  return checkVersion(id, installed, minimum)
}

async function checkPythonPackages(python: CommandResult | null): Promise<PrerequisiteCheck[]> {
  const packages: readonly {
    id: PrerequisiteCheckId
    minimum: readonly number[]
    packageName: string
  }[] = [
    { id: 'faster-whisper', packageName: 'faster-whisper', minimum: [1, 0] },
    { id: 'ctranslate2', packageName: 'ctranslate2', minimum: [4, 0] },
    { id: 'torch', packageName: 'torch', minimum: [2, 0] }
  ]

  if (!python) {
    return packages.map((entry) => checkVersion(entry.id, null, entry.minimum))
  }

  const packageNames = JSON.stringify(packages.map((entry) => entry.packageName))
  const code = [
    'import importlib.metadata as m',
    `packages = ${packageNames}`,
    'for package in packages:',
    '    try:',
    '        print(f"{package}={m.version(package)}")',
    '    except m.PackageNotFoundError:',
    '        print(f"{package}=")'
  ].join('\n')
  const output = await runCommand(python.command, [...python.prefixArgs, '-c', code], 3000)
  const versions = new Map(
    (output ?? '')
      .split(/\r?\n/)
      .map((line) => line.split('='))
      .filter(([packageName]) => packageName)
      .map(([packageName, version]) => [packageName, parseVersion(version ?? '')])
  )

  return packages.map((entry) =>
    checkVersion(entry.id, versions.get(entry.packageName) ?? null, entry.minimum)
  )
}

async function checkPrerequisites(): Promise<PrerequisiteCheck[]> {
  const { check: pythonCheck, python } = await checkPython()
  const [ffmpegCheck, cudaCheck, pythonPackageChecks] = await Promise.all([
    checkCommandVersion('ffmpeg', [{ command: 'ffmpeg', args: ['-version'], timeoutMs: 1500 }]),
    checkCommandVersion(
      'cuda',
      [{ command: 'nvcc', args: ['--version'], timeoutMs: 1500 }],
      [11, 8]
    ),
    checkPythonPackages(python)
  ])
  const checks = [pythonCheck, ffmpegCheck, cudaCheck, ...pythonPackageChecks]

  return prerequisiteIds.map(
    (id) => checks.find((check) => check.id === id) ?? { id, installed: null, status: 'missing' }
  )
}

async function getCachedPrerequisites(): Promise<PrerequisiteCheck[]> {
  if (prerequisiteCache && Date.now() - prerequisiteCache.checkedAt < prerequisiteCacheDurationMs) {
    return prerequisiteCache.value
  }

  if (!prerequisiteRequest) {
    prerequisiteRequest = checkPrerequisites().then((value) => {
      prerequisiteCache = { checkedAt: Date.now(), value }
      prerequisiteRequest = null
      return value
    })
  }

  return prerequisiteRequest
}

export function registerSystemHandlers(resolveWindow: WindowResolver): void {
  ipcMain.handle(IPC_CHANNELS.appInfo, (): AppInfo => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node
    }
  })

  ipcMain.handle(IPC_CHANNELS.platform, (): DesktopPlatform => {
    return process.platform as DesktopPlatform
  })

  ipcMain.handle(IPC_CHANNELS.systemStatus, (): SystemStatus => {
    const primaryCpu = cpus()[0]?.model?.replace(/\s+/g, ' ').trim() || process.arch

    return {
      ready: true,
      status: 'System Ready',
      activity: 'Idle',
      metrics: [
        { label: 'CPU', value: primaryCpu },
        { label: 'Memory', value: formatMemory(totalmem()) },
        { label: 'Platform', value: process.platform }
      ]
    }
  })

  ipcMain.handle(IPC_CHANNELS.prerequisites, async (): Promise<PrerequisiteCheck[]> => {
    return getCachedPrerequisites()
  })

  ipcMain.handle(IPC_CHANNELS.windowIsMaximized, () => {
    return resolveWindow()?.isMaximized() ?? false
  })

  ipcMain.handle(IPC_CHANNELS.windowMinimize, () => {
    resolveWindow()?.minimize()
  })

  ipcMain.handle(IPC_CHANNELS.windowMaximize, () => {
    const window = resolveWindow()

    if (!window) {
      return
    }

    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  })

  ipcMain.handle(IPC_CHANNELS.windowClose, () => {
    resolveWindow()?.close()
  })
}
