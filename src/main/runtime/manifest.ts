import { app, net } from 'electron'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { RuntimeArtifact, RuntimeManifest } from '../../shared/ipc'
import { DEFAULT_MANIFEST_URL } from '../../shared/constants'

function isArtifact(value: unknown): value is RuntimeArtifact {
  if (!value || typeof value !== 'object') return false
  const artifact = value as Partial<RuntimeArtifact>
  return (
    typeof artifact.id === 'string' &&
    typeof artifact.version === 'string' &&
    ['win32', 'darwin', 'linux'].includes(artifact.platform ?? '') &&
    ['x64', 'arm64'].includes(artifact.arch ?? '') &&
    ['cpu', 'cuda'].includes(artifact.accelerator ?? '') &&
    artifact.format === 'zip' &&
    typeof artifact.url === 'string' &&
    typeof artifact.sizeBytes === 'number' &&
    /^[a-f0-9]{64}$/i.test(artifact.sha256 ?? '')
  )
}

export function parseRuntimeManifest(value: unknown): RuntimeManifest {
  if (!value || typeof value !== 'object') throw new Error('Runtime manifest is invalid.')
  const manifest = value as Partial<RuntimeManifest>
  if (
    manifest.schemaVersion !== 1 ||
    typeof manifest.runtimeVersion !== 'string' ||
    !Array.isArray(manifest.artifacts) ||
    !manifest.artifacts.every(isArtifact)
  ) {
    throw new Error('Runtime manifest has an unsupported format.')
  }
  return manifest as RuntimeManifest
}

async function readBundledManifest(): Promise<RuntimeManifest> {
  const base = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
  const content = await readFile(join(base, 'runtime-manifest.json'), 'utf8')
  return parseRuntimeManifest(JSON.parse(content))
}

export async function loadRuntimeManifest(): Promise<RuntimeManifest> {
  const manifestUrl = process.env.WHISPER_STUDIO_RUNTIME_MANIFEST_URL ?? DEFAULT_MANIFEST_URL
  try {
    const response = await net.fetch(manifestUrl)
    if (!response.ok) throw new Error(`Manifest request failed with HTTP ${response.status}.`)
    return parseRuntimeManifest(await response.json())
  } catch {
    return readBundledManifest()
  }
}
