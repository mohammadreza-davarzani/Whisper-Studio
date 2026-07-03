import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const require = createRequire(import.meta.url)
const { appBuilderPath } = require('app-builder-bin')

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceLogo = path.join(rootDir, 'src', 'renderer', 'src', 'logo.svg')
const resourcesDir = path.join(rootDir, 'resources')
const iconsDir = path.join(resourcesDir, 'icons')
const iconPng = path.join(resourcesDir, 'icon.png')
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024]

await mkdir(iconsDir, { recursive: true })

await Promise.all([
  rm(path.join(resourcesDir, 'icon.ico'), { force: true }),
  rm(path.join(resourcesDir, 'icon.icns'), { force: true }),
  rm(path.join(resourcesDir, 'icon.png'), { force: true })
])

await sharp(sourceLogo).resize(1024, 1024).png().toFile(iconPng)

await Promise.all(
  sizes.map((size) =>
    sharp(sourceLogo)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `${size}x${size}.png`))
  )
)

for (const format of ['ico', 'icns']) {
  const result = spawnSync(
    appBuilderPath,
    ['icon', '--input', iconPng, '--format', format, '--out', resourcesDir],
    { cwd: rootDir, stdio: 'inherit' }
  )

  if (result.status !== 0) {
    throw new Error(`Failed to generate ${format} icon`)
  }
}
