import { describe, expect, it } from 'vitest'
import {
  createPipPackageProgressTracker,
  normalizePipInstallError,
  parsePipProgressLine
} from '@main/prerequisites/pip'

describe('createPipPackageProgressTracker()', () => {
  it('counts unique discovered packages and download artifacts', () => {
    const track = createPipPackageProgressTracker()

    expect(track('Collecting torch>=2.0')).toEqual({
      downloadsStarted: 0,
      packagesDiscovered: 1
    })
    expect(track('Collecting faster_whisper')).toEqual({
      downloadsStarted: 0,
      packagesDiscovered: 2
    })
    expect(track('Downloading https://files.example/torch-2.0.whl.metadata (30 kB)')).toEqual({
      downloadsStarted: 1,
      packagesDiscovered: 2
    })
    expect(track('Downloading https://files.example/torch-2.0.whl (2.5 GB)')).toEqual({
      downloadsStarted: 1,
      packagesDiscovered: 2
    })
  })
})

describe('parsePipProgressLine()', () => {
  it('parses completed pip download progress lines', () => {
    expect(parsePipProgressLine('18.7/18.7 MB 3.4 MB/s eta 0:00:05')).toEqual({
      downloadedBytes: 18.7 * 1024 ** 2,
      totalBytes: 18.7 * 1024 ** 2,
      speedBytesPerSec: 3.4 * 1024 ** 2,
      etaSeconds: 5
    })
  })

  it('parses pip download header lines', () => {
    expect(parsePipProgressLine('  Downloading faster_whisper-1.1.1.whl (18.7 MB)')).toEqual({
      downloadedBytes: 0,
      totalBytes: 18.7 * 1024 ** 2
    })
  })

  it('ignores unrelated lines', () => {
    expect(parsePipProgressLine('Installing collected packages: torch')).toBeNull()
  })
})

describe('normalizePipInstallError()', () => {
  it('compresses SSL failures into an actionable message', () => {
    expect(normalizePipInstallError('SSLError: DECRYPTION_FAILED_OR_BAD_RECORD_MAC')).toContain(
      'pip failed while downloading packages over SSL'
    )
  })

  it('filters routine pip output and keeps meaningful errors', () => {
    const stderr = [
      'Collecting torch',
      'Downloading torch.whl (2.5 GB)',
      'ERROR: Could not find a version that satisfies the requirement whisperx'
    ].join('\n')

    expect(normalizePipInstallError(stderr)).toBe(
      'ERROR: Could not find a version that satisfies the requirement whisperx'
    )
  })
})
