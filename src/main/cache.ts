export interface ScopedCache<T> {
  get: () => Promise<T>
  invalidate: () => void
}

/**
 * Creates a time-scoped, request-deduplicating async cache.
 *
 * - Results are reused for `durationMs` milliseconds after the last successful fetch.
 * - Concurrent callers share a single in-flight request rather than triggering multiple fetches.
 * - Call `invalidate()` to force a fresh fetch on the next `get()` call.
 */
export function createScopedCache<T>(
  fetcher: () => Promise<T>,
  durationMs: number
): ScopedCache<T> {
  let cache: { checkedAt: number; value: T } | null = null
  let pendingRequest: Promise<T> | null = null

  return {
    get(): Promise<T> {
      if (cache && Date.now() - cache.checkedAt < durationMs) {
        return Promise.resolve(cache.value)
      }

      if (!pendingRequest) {
        pendingRequest = fetcher().then(
          (value) => {
            cache = { checkedAt: Date.now(), value }
            pendingRequest = null
            return value
          },
          (error: unknown) => {
            pendingRequest = null
            throw error
          }
        )
      }

      return pendingRequest
    },

    invalidate(): void {
      cache = null
      pendingRequest = null
    }
  }
}
