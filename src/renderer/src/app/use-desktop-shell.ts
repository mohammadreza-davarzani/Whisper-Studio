import { useEffect, useMemo, useState } from 'react'
import type { AppInfo, DesktopApi, DesktopPlatform, SystemStatus } from '@shared/ipc'
import { getDesktopApi } from '@/lib/desktop'

interface DesktopShellState {
  appInfo: AppInfo | null
  desktop: DesktopApi
  isWindowMaximized: boolean
  isShellReady: boolean
  platform: DesktopPlatform
  systemStatus: SystemStatus | null
}

export function useDesktopShell(): DesktopShellState {
  const desktop = useMemo(() => getDesktopApi(), [])
  const [isWindowMaximized, setIsWindowMaximized] = useState(false)
  const [platform, setPlatform] = useState<DesktopPlatform>('win32')
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [isShellReady, setIsShellReady] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadShellState = async (): Promise<void> => {
      const [platformResult, appInfoResult, systemStatusResult, isMaximizedResult] =
        await Promise.allSettled([
          desktop.getPlatform(),
          desktop.getAppInfo(),
          desktop.getSystemStatus(),
          desktop.windowControls.isMaximized()
        ])

      if (!mounted) return

      if (platformResult.status === 'fulfilled') setPlatform(platformResult.value)
      if (appInfoResult.status === 'fulfilled') setAppInfo(appInfoResult.value)
      if (systemStatusResult.status === 'fulfilled') setSystemStatus(systemStatusResult.value)
      if (isMaximizedResult.status === 'fulfilled') setIsWindowMaximized(isMaximizedResult.value)
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
    systemStatus
  }
}
