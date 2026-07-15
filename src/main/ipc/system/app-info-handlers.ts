import { app, ipcMain } from 'electron'
import { AppInfo, DesktopPlatform, IPC_CHANNELS } from '../../../shared/ipc'

export function registerAppInfoHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.appInfo, getAppInfo)
  ipcMain.handle(IPC_CHANNELS.platform, getDesktopPlatform)
}

export function getAppInfo(): AppInfo {
  return {
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    userDataPath: app.getPath('userData')
  }
}

export function getDesktopPlatform(): DesktopPlatform {
  return process.platform as DesktopPlatform
}
