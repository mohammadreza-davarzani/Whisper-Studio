/** Raised when the whisper CLI process fails or produces unexpected output. */
export class TranscriptionError extends Error {
  readonly exitCode: number | null
  readonly stderr: string

  constructor(message: string, exitCode: number | null, stderr: string) {
    super(message)
    this.name = 'TranscriptionError'
    this.exitCode = exitCode
    this.stderr = stderr
  }
}
