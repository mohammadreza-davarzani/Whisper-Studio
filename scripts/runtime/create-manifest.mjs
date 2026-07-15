import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import process from 'node:process'

const cliArgs = process.argv.slice(2)
const namedArgs = new Map()
const positionalArgs = []
for (let index = 0; index < cliArgs.length; index += 1) {
  const argument = cliArgs[index]
  if (argument.startsWith('--')) {
    namedArgs.set(argument, cliArgs[index + 1])
    index += 1
  } else {
    positionalArgs.push(argument)
  }
}

const directory = resolve(namedArgs.get('--input') ?? positionalArgs[0] ?? 'runtime-dist')
const runtimeVersion = namedArgs.get('--version') ?? positionalArgs[1] ?? '1.0.0'
const output = resolve(namedArgs.get('--output') ?? join(directory, 'runtime-manifest.json'))
const files = (await readdir(directory)).filter((name) => name.endsWith('.artifact.json'))
const artifacts = await Promise.all(
  files.map(async (name) => JSON.parse(await readFile(join(directory, name), 'utf8')))
)
const manifest = { schemaVersion: 1, runtimeVersion, artifacts }
await writeFile(output, JSON.stringify(manifest, null, 2), 'utf8')
process.stdout.write(`${output}\n`)
