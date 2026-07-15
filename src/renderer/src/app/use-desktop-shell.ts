import { useEffect, useMemo, useState } from 'react'
import type { AppInfo, DesktopApi, DesktopPlatform, RuntimeStatus, SystemStatus } from '@shared/ipc'
import { getDesktopApi } from '@/lib/desktop'

interface DesktopShellState {
  appInfo: AppInfo | null
  desktop: DesktopApi
  isWindowMaximized: boolean
  isShellReady: boolean
  platform: DesktopPlatform
  systemStatus: SystemStatus | null
  runtimeStatus: RuntimeStatus | null
  setRuntimeStatus: (status: RuntimeStatus) => void
}

export function useDesktopShell(): DesktopShellState {
  const desktop = useMemo(() => getDesktopApi(), [])
  const [isWindowMaximized, setIsWindowMaximized] = useState(false)
  const [platform, setPlatform] = useState<DesktopPlatform>('win32')
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [isShellReady, setIsShellReady] = useState(false)
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null)

  useEffect(() => {
    let mounted = true

    const loadShellState = async (): Promise<void> => {
      const [platformResult, appInfoResult, systemStatusResult, isMaximizedResult, runtimeResult] =
        await Promise.allSettled([
          desktop.getPlatform(),
          desktop.getAppInfo(),
          desktop.getSystemStatus(),
          desktop.windowControls.isMaximized(),
          desktop.getRuntimeStatus()
        ])

      if (!mounted) return

      if (platformResult.status === 'fulfilled') setPlatform(platformResult.value)
      if (appInfoResult.status === 'fulfilled') setAppInfo(appInfoResult.value)
      if (systemStatusResult.status === 'fulfilled') setSystemStatus(systemStatusResult.value)
      if (isMaximizedResult.status === 'fulfilled') setIsWindowMaximized(isMaximizedResult.value)
      if (runtimeResult.status === 'fulfilled') setRuntimeStatus(runtimeResult.value)
      else setRuntimeStatus({ active: null, available: [], recommended: null, state: 'missing' })
      setIsShellReady(true)
    }

    void loadShellState()
    const unsubscribe = desktop.windowControls.onStateChange(setIsWindowMaximized)

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [desktop])

  return {
    appInfo,
    desktop,
    isWindowMaximized,
    isShellReady,
    platform,
    systemStatus,
    runtimeStatus,
    setRuntimeStatus
  }
}
