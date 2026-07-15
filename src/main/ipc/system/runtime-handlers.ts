import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type {
  RuntimeActionResult,
  RuntimeInstallProgress,
  RuntimeManifest,
  RuntimeStatus
} from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { loadRuntimeManifest } from '../../runtime/manifest'
import { getRuntimeStatus, installRuntime, removeRuntime } from '../../runtime/manager'

export function registerRuntimeHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.runtimeManifest,
    (): Promise<RuntimeManifest> => loadRuntimeManifest()
  )
  ipcMain.handle(IPC_CHANNELS.runtimeStatus, (): Promise<RuntimeStatus> => getRuntimeStatus())
  ipcMain.handle(
    IPC_CHANNELS.runtimeInstall,
    (event: IpcMainInvokeEvent, artifactId?: string): Promise<RuntimeActionResult> =>
      installRuntime(artifactId, (progress: RuntimeInstallProgress) =>
        event.sender.send(IPC_CHANNELS.runtimeInstallProgress, progress)
      )
  )
  ipcMain.handle(IPC_CHANNELS.runtimeRemove, (): Promise<RuntimeActionResult> => removeRuntime())
}
