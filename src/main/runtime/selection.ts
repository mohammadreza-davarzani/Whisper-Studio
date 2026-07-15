import type { RuntimeAccelerator, RuntimeArtifact } from '../../shared/ipc'

export interface RuntimeTarget {
  accelerator: RuntimeAccelerator
  arch: NodeJS.Architecture
  platform: NodeJS.Platform
}

export function compareNumericVersions(actual: string, required: string): number {
  const actualParts = actual.split('.').map(Number)
  const requiredParts = required.split('.').map(Number)
  const length = Math.max(actualParts.length, requiredParts.length)
  for (let index = 0; index < length; index += 1) {
    const difference = (actualParts[index] ?? 0) - (requiredParts[index] ?? 0)
    if (difference !== 0) return difference > 0 ? 1 : -1
  }
  return 0
}

export function selectRuntimeArtifact(
  artifacts: readonly RuntimeArtifact[],
  target: RuntimeTarget
): RuntimeArtifact | null {
  return (
    artifacts.find(
      (artifact) =>
        artifact.platform === target.platform &&
        artifact.arch === target.arch &&
        artifact.accelerator === target.accelerator
    ) ?? null
  )
}

export function getCompatibleRuntimeArtifacts(
  artifacts: readonly RuntimeArtifact[],
  platform: NodeJS.Platform,
  arch: NodeJS.Architecture
): RuntimeArtifact[] {
  return artifacts.filter((artifact) => artifact.platform === platform && artifact.arch === arch)
}
