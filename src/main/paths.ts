import { app } from 'electron'
import { join } from 'node:path'

export function getOutputDirectory(): string {
  return join(app.getPath('documents'), 'Whisper Studio', 'exports')
}
