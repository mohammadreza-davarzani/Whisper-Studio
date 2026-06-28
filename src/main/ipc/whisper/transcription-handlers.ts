import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { basename, join } from 'node:path'
import { writeFile } from 'node:fs/promises'
import {
  IPC_CHANNELS,
  type TranscriptionRecord,
  type WhisperTranscriptionRequest,
  type WhisperTranscriptionResult
} from '../../../shared/ipc'
import { runWhisper, getOutputDirectory } from './executor'
import { parseWhisperJson } from './parser'

export function registerTranscriptionHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.whisperTranscribe,
    async (
      event: IpcMainInvokeEvent,
      request: WhisperTranscriptionRequest
    ): Promise<WhisperTranscriptionResult> => {
      const runResult = await runWhisper(
        request,
        (chunk) => event.sender.send(IPC_CHANNELS.whisperOutputChunk, chunk),
        (update) => event.sender.send(IPC_CHANNELS.whisperProgressUpdate, update)
      )

      if (!runResult.ok) {
        return {
          command: '',
          exitCode: null,
          stderr: runResult.error.message,
          stdout: ''
        }
      }

      const { command, exitCode, outputDirectory, stdout, stderr } = runResult.value

      const parseResult = await parseWhisperJson(outputDirectory, basename(request.filePath))
      const segments = parseResult.ok ? parseResult.value.segments : []
      const jsonFile = parseResult.ok ? parseResult.value.jsonFile : null

      const record: TranscriptionRecord = {
        id: basename(outputDirectory),
        sourceFileName: basename(request.filePath),
        sourceFilePath: request.filePath,
        model: request.model || 'base',
        language: request.language || 'auto',
        compute: request.compute,
        outputDirectory,
        outputFiles: jsonFile ? [jsonFile] : [],
        segments,
        durationSeconds: segments.length > 0 ? segments[segments.length - 1].end : null,
        createdAt: Date.now(),
        exitCode
      }

      await writeFile(
        join(outputDirectory, 'whisper-studio.json'),
        JSON.stringify(record, null, 2),
        'utf8'
      ).catch(() => undefined)

      return {
        command,
        exitCode,
        outputDirectory,
        outputFiles: record.outputFiles,
        record,
        stderr,
        stdout
      }
    }
  )
}

export { getOutputDirectory }
