import { describe, expect, it } from 'vitest'
import { shouldShowSetup } from '@/app/setup-state'

describe('shouldShowSetup()', () => {
  it('shows setup only after the shell is ready and setup is incomplete', () => {
    expect(shouldShowSetup(false, false)).toBe(false)
    expect(shouldShowSetup(true, false)).toBe(true)
    expect(shouldShowSetup(true, true)).toBe(false)
  })
})
