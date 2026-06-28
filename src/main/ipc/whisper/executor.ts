import { app } from 'electron'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import type {
  WhisperOutputChunk,
  WhisperProgressUpdate,
  WhisperTranscriptionRequest
} from '../../../shared/ipc'
import { TranscriptionError } from '../../../shared/errors'
import { type Result, ok, err } from '../../../shared/types'
import { getPythonEnv, normalizeLanguage, sanitizeFileName, getTimestamp } from './utils'

export function getOutputDirectory(): string {
  return join(app.getPath('documents'), 'Whisper Studio', 'exports')
}

function buildArgs(request: WhisperTranscriptionRequest, outputDir: string): string[] {
  const device = request.compute === 'gpu' ? 'cuda' : 'cpu'
  const language = normalizeLanguage(request.language)
  const model = request.model || 'base'

  const args = [
    request.filePath,
    '--model',
    model,
    '--output_format',
    'json',
    '--output_dir',
    outputDir,
    '--device',
    device,
    '--verbose',
    'True'
  ]

  if (language) {
    args.push('--language', language)
  }

  if (request.translate) {
    args.push('--task', 'translate')
  }

  if (request.wordTimestamps) {
    args.push('--word_timestamps', 'True')
  }

  return args
}

export interface ExecutorResult {
  args: string[]
  command: string
  exitCode: number | null
  outputDirectory: string
  stderr: string
  stdout: string
}

export async function runWhisper(
  request: WhisperTranscriptionRequest,
  onOutput: (chunk: WhisperOutputChunk) => void,
  onProgress: (update: WhisperProgressUpdate) => void
): Promise<Result<ExecutorResult, TranscriptionError>> {
  if (typeof request.filePath !== 'string' || !request.filePath.trim()) {
    return err(
      new TranscriptionError('A valid media file path is required for transcription.', null, '')
    )
  }

  onProgress({ phase: 'checking-command', state: 'complete', message: 'Starting transcription.' })
  onProgress({ phase: 'checking-whisper', state: 'complete', message: 'Environment ready.' })

  const extension = extname(request.filePath)
  const baseName = sanitizeFileName(basename(request.filePath, extension)) || 'transcript'
  const outputDirectory = join(getOutputDirectory(), `${baseName}-${getTimestamp()}`)
  await mkdir(outputDirectory, { recursive: true })

  const args = buildArgs(request, outputDirectory)
  const command = `whisper ${args.join(' ')}`

  onProgress({ phase: 'sending-command', state: 'complete', message: command })

  return new Promise<Result<ExecutorResult, TranscriptionError>>((resolve) => {
    const child = spawn('whisper', args, {
      cwd: dirname(request.filePath),
      env: getPythonEnv(),
      windowsHide: true
    })

    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    const stdoutDecoder = new StringDecoder('utf8')
    const stderrDecoder = new StringDecoder('utf8')

    onProgress({
      phase: 'transcribing',
      state: 'active',
      message: 'Loading model and transcribing...'
    })

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk)
      const text = stdoutDecoder.write(chunk)
      if (text) onOutput({ stream: 'stdout', text })
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk)
      const text = stderrDecoder.write(chunk)
      if (text) onOutput({ stream: 'stderr', text })
    })

    child.on('error', (spawnError) => {
      onProgress({ phase: 'error', state: 'error', message: spawnError.message })
      resolve(err(new TranscriptionError(spawnError.message, null, spawnError.message)))
    })

    child.on('close', (exitCode) => {
      const remaining = stdoutDecoder.end()
      const remainingErr = stderrDecoder.end()
      if (remaining) onOutput({ stream: 'stdout', text: remaining })
      if (remainingErr) onOutput({ stream: 'stderr', text: remainingErr })

      const stdout = Buffer.concat(stdoutChunks).toString('utf8')
      const stderr = Buffer.concat(stderrChunks).toString('utf8')

      onProgress({
        phase: exitCode === 0 ? 'complete' : 'error',
        state: exitCode === 0 ? 'complete' : 'error',
        message:
          exitCode === 0
            ? 'Transcription complete.'
            : `Whisper exited with code ${exitCode ?? 'unknown'}.`
      })

      resolve(
        ok({
          args,
          command,
          exitCode,
          outputDirectory,
          stderr,
          stdout
        })
      )
    })
  })
}
