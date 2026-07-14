import { describe, expect, it, vi } from 'vitest'
import { createScopedCache } from '@main/cache'

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('createScopedCache()', () => {
  it('does not restore stale data when an in-flight request completes after invalidation', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const fetcher = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const cache = createScopedCache(fetcher, 5_000)

    const staleRequest = cache.get()
    cache.invalidate()
    const freshRequest = cache.get()

    first.resolve('stale')
    await expect(staleRequest).resolves.toBe('stale')
    second.resolve('fresh')
    await expect(freshRequest).resolves.toBe('fresh')

    await expect(cache.get()).resolves.toBe('fresh')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
