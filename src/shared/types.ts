/**
 * A discriminated union for operations that can succeed or fail.
 *
 * Usage:
 *   function parse(raw: string): Result<Parsed, ParseError> { ... }
 *
 *   const result = parse(raw)
 *   if (result.ok) {
 *     use(result.value)
 *   } else {
 *     handle(result.error)
 *   }
 */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }

/** Wrap a resolved value in a successful Result. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

/** Wrap an error value in a failed Result. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}
