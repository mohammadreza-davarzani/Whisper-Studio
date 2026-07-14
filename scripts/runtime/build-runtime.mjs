import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { cp, mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import archiver from 'archiver'
import process from 'node:process'

const args = new Map()
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1])
}

const pythonSource = args.get('--python-root')
const ffmpegSource = args.get('--ffmpeg-dir')
const accelerator = args.get('--accelerator') ?? 'cpu'
const runtimeVersion = args.get('--version') ?? '1.0.0'
const outputDir = resolve(args.get('--output') ?? 'runtime-dist')
const baseUrl = (args.get('--base-url') ?? '').replace(/\/$/, '')
const minimumNvidiaDriver =
  args.get('--minimum-nvidia-driver') ??
  (accelerator === 'cuda' ? (process.platform === 'win32' ? '570.65' : '570.26') : undefined)

if (!pythonSource || !ffmpegSource || !['cpu', 'cuda'].includes(accelerator)) {
  throw new Error(
    'Usage: npm run runtime:build -- --python-root <portable-python> --ffmpeg-dir <ffmpeg-bin> --accelerator <cpu|cuda> [--version 1.0.0] [--output runtime-dist] [--base-url URL]'
  )
}

const platform = process.platform
if (!['win32', 'darwin', 'linux'].includes(platform)) {
  throw new Error(`Unsupported build platform: ${platform}`)
}
if (platform === 'darwin' && accelerator === 'cuda') {
  throw new Error('CUDA Runtime artifacts are not supported on macOS.')
}

const arch = process.arch
const id = `whisper-runtime-${platform}-${arch}-${accelerator}-${runtimeVersion}`
const staging = join(outputDir, `${id}.staging`)
const runtimeRoot = staging
const pythonRoot = join(runtimeRoot, 'python')
const ffmpegRoot = join(runtimeRoot, 'ffmpeg')
const archivePath = join(outputDir, `${id}.zip`)

await rm(staging, { recursive: true, force: true })
await mkdir(outputDir, { recursive: true })
// uv exposes version aliases as junctions on Windows. Resolve the source roots so
// the archive contains their files instead of a single link entry.
await cp(await realpath(resolve(pythonSource)), pythonRoot, { recursive: true })
await cp(await realpath(resolve(ffmpegSource)), ffmpegRoot, { recursive: true })

const python =
  platform === 'win32' ? join(pythonRoot, 'python.exe') : join(pythonRoot, 'bin', 'python')

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', windowsHide: true })
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${command} ${commandArgs.join(' ')}`)
  }
}

// The source Python may be managed by uv and marked as externally managed.
// We only modify the disposable copy in the runtime staging directory.
const pipInstall = ['-m', 'pip', 'install', '--break-system-packages']

run(python, [...pipInstall, '--upgrade', 'pip'])
const torchIndex =
  accelerator === 'cuda'
    ? 'https://download.pytorch.org/whl/cu128'
    : 'https://download.pytorch.org/whl/cpu'
run(python, [
  ...pipInstall,
  '--no-cache-dir',
  '--index-url',
  torchIndex,
  'torch==2.8.0',
  'torchaudio==2.8.0',
  'torchvision==0.23.0'
])
run(python, [...pipInstall, '--no-cache-dir', 'whisperx==3.8.6'])
run(python, [
  '-c',
  'import ctranslate2, faster_whisper, torch, torchaudio, whisperx; print(torch.__version__)'
])

await writeFile(
  join(runtimeRoot, 'runtime.json'),
  JSON.stringify(
    {
      accelerator,
      arch,
      packages: { torch: '2.8.0', torchaudio: '2.8.0', whisperx: '3.8.6' },
      platform,
      runtimeVersion
    },
    null,
    2
  ),
  'utf8'
)

await rm(archivePath, { force: true })
await new Promise((resolveArchive, rejectArchive) => {
  const output = createWriteStream(archivePath)
  const zip = archiver('zip', { zlib: { level: 9 } })
  output.on('close', resolveArchive)
  output.on('error', rejectArchive)
  zip.on('error', rejectArchive)
  zip.pipe(output)
  zip.directory(runtimeRoot, false)
  void zip.finalize()
})

const bytes = await readFile(archivePath)
const artifact = {
  accelerator,
  arch,
  format: 'zip',
  id,
  ...(minimumNvidiaDriver ? { minimumNvidiaDriver } : {}),
  platform,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  sizeBytes: (await stat(archivePath)).size,
  url: baseUrl ? `${baseUrl}/${basename(archivePath)}` : basename(archivePath),
  version: runtimeVersion
}
await writeFile(`${archivePath}.artifact.json`, JSON.stringify(artifact, null, 2), 'utf8')
await rm(staging, { recursive: true, force: true })
process.stdout.write(`${archivePath}\n`)
