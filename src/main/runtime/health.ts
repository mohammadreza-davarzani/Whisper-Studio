import { execFile } from 'node:child_process'
import { access, chmod } from 'node:fs/promises'
import type { RuntimeArtifact } from '../../shared/ipc'
import { getRuntimeFfmpegPath, getRuntimePythonPath } from './paths'

function run(command: string, args: readonly string[], timeout = 30_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, [...args], { timeout, windowsHide: true }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${stderr || stdout || error.message}`.trim()))
      else resolve(`${stdout}${stderr}`.trim())
    })
  })
}

export async function checkRuntime(root: string, artifact: RuntimeArtifact): Promise<void> {
  const python = getRuntimePythonPath(root)
  const ffmpeg = getRuntimeFfmpegPath(root)
  await Promise.all([access(python), access(ffmpeg)])

  if (process.platform !== 'win32') {
    await Promise.all([chmod(python, 0o755), chmod(ffmpeg, 0o755)])
  }

  const probe = [
    'import json, torch, torchaudio, whisperx, ctranslate2',
    `cuda_ok = torch.cuda.is_available() if ${JSON.stringify(artifact.accelerator)} == "cuda" else True`,
    'print(json.dumps({"ok": bool(cuda_ok), "torch": torch.__version__}))',
    'raise SystemExit(0 if cuda_ok else 2)'
  ].join('; ')
  await run(python, ['-c', probe])
  await run(ffmpeg, ['-version'], 10_000)
}

export async function checkRuntimeFiles(root: string): Promise<void> {
  await Promise.all([
    access(getRuntimePythonPath(root)),
    access(getRuntimeFfmpegPath(root))
  ])
}
