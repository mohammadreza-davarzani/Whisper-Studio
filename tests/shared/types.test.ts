import { describe, it, expect } from 'vitest'
import { ok, err, type Result } from '@shared/types'

describe('ok()', () => {
  it('returns an ok result with the given value', () => {
    const result = ok(42)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe(42)
  })

  it('works with string values', () => {
    const result = ok('hello')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe('hello')
  })

  it('works with null values', () => {
    const result = ok(null)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeNull()
  })

  it('works with object values', () => {
    const value = { a: 1, b: 'two' }
    const result = ok(value)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe(value)
  })
})

describe('err()', () => {
  it('returns a failed result with the given error', () => {
    const error = new Error('something went wrong')
    const result = err(error)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe(error)
  })

  it('works with string errors', () => {
    const result = err('bad input')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('bad input')
  })

  it('works with custom error objects', () => {
    const error = { code: 404, message: 'not found' }
    const result = err(error)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe(error)
  })
})

describe('Result discriminated union', () => {
  function divide(a: number, b: number): Result<number, string> {
    if (b === 0) return err('division by zero')
    return ok(a / b)
  }

  it('narrowing ok branch gives typed value', () => {
    const result = divide(10, 2)
    if (!result.ok) throw new Error('expected ok')
    expect(result.value).toBe(5)
  })

  it('narrowing err branch gives typed error', () => {
    const result = divide(10, 0)
    if (result.ok) throw new Error('expected error')
    expect(result.error).toBe('division by zero')
  })

  it('both branches are exhaustive', () => {
    const result = divide(7, 2)
    const output = result.ok ? `value:${result.value}` : `error:${result.error}`
    expect(output).toBe('value:3.5')
  })
})
