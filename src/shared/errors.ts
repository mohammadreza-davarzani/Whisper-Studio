import type { PrerequisiteCheckId } from './ipc'

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

/** Raised when a model download or deletion fails. */
export class ModelError extends Error {
  readonly modelId: string
  readonly stderr: string | undefined

  constructor(message: string, modelId: string, stderr?: string) {
    super(message)
    this.name = 'ModelError'
    this.modelId = modelId
    this.stderr = stderr
  }
}

/** Raised when a prerequisite check or installation fails. */
export class PrerequisiteError extends Error {
  readonly prerequisiteId: PrerequisiteCheckId
  readonly stderr: string | undefined

  constructor(message: string, prerequisiteId: PrerequisiteCheckId, stderr?: string) {
    super(message)
    this.name = 'PrerequisiteError'
    this.prerequisiteId = prerequisiteId
    this.stderr = stderr
  }
}
