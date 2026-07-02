import { registerTranscriptionHandlers } from './transcription-handlers'
import { registerRecordHandlers } from '../system/record-handlers'

export function registerWhisperHandlers(): void {
  registerTranscriptionHandlers()
  registerRecordHandlers()
}

// Re-export for callers that only need the output directory path
export { getOutputDirectory } from '../../paths'
