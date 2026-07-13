import type {
  AppInfo,
  DesktopApi,
  DesktopPlatform,
  DownloadedWhisperModelsResult,
  PrerequisiteCheck,
  PrerequisiteCheckId,
  PrerequisiteInstallResult,
  SystemStatus,
  WhisperModelActionResult
} from '@shared/ipc'

function detectBrowserPlatform(): DesktopPlatform {
  const platform = navigator.platform.toLowerCase()

  if (platform.includes('mac')) {
    return 'darwin'
  }

  if (platform.includes('win')) {
    return 'win32'
  }

  return 'linux'
}

const browserDesktopApi: DesktopApi = {
  getAppInfo: async (): Promise<AppInfo> => ({
    name: 'Whisper Studio',
    version: '0.1.0',
    electron: 'browser',
    chrome: 'browser',
    node: 'browser'
  }),
  getPlatform: async () => detectBrowserPlatform(),
  getSystemStatus: async (): Promise<SystemStatus> => ({
    ready: true,
    status: 'System Ready',
    metrics: [
      {
        label: 'CPU',
        value: navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} cores` : 'Browser'
      },
      { label: 'GPU', value: 'Browser' },
      { label: 'Memory', value: 'Browser' },
      { label: 'Platform', value: detectBrowserPlatform() }
    ]
  }),
  getPrerequisites: async (): Promise<PrerequisiteCheck[]> => [
    { id: 'python', installed: null, status: 'missing' },
    { id: 'ffmpeg', installed: null, status: 'missing' },
    { id: 'cuda', installed: null, status: 'missing' },
    { id: 'torch', installed: null, status: 'missing' }
  ],
  installPrerequisite: async (id: PrerequisiteCheckId): Promise<PrerequisiteInstallResult> => ({
    action: 'opened',
    id,
    ok: false,
    stderr: 'Prerequisite installation is available in the Electron desktop app.'
  }),
  getDownloadedModels: async (): Promise<DownloadedWhisperModelsResult> => ({
    models: [],
    totalSizeBytes: 0
  }),
  downloadModel: async (repoId: string): Promise<WhisperModelActionResult> => ({
    id: repoId,
    ok: false,
    stderr: 'Model downloads are available in the Electron desktop app.'
  }),
  deleteModel: async (id: string): Promise<WhisperModelActionResult> => ({
    id,
    ok: false,
    stderr: 'Model deletion is available in the Electron desktop app.'
  }),
  getFilePath: (file: unknown): string => {
    if (file instanceof File) {
      return file.name
    }

    return ''
  },
  onModelDownloadProgress: () => () => undefined,
  selectWhisperFile: async () => ({ canceled: true }),
  transcribeWithWhisper: async (request) => ({
    command: `python.exe -u -c faster_whisper "${request.filePath}"`,
    exitCode: 1,
    stdout: '',
    stderr: 'Whisper transcription is available in the Electron desktop app.'
  }),
  onWhisperOutput: () => () => undefined,
  onWhisperProgress: () => () => undefined,
  listTranscriptions: async () => [],
  deleteTranscription: async () => ({ ok: false }),
  readTextFile: async () => '',
  writeTextFile: async () => {},
  selectDirectory: async () => null,
  windowControls: {
    isMaximized: async () => false,
    minimize: async () => undefined,
    maximize: async () => undefined,
    close: async () => undefined,
    onStateChange: () => () => undefined
  }
}

export function getDesktopApi(): DesktopApi {
  return window.desktop ?? browserDesktopApi
}
