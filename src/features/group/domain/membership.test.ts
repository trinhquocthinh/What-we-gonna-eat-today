import { describe, expect, it } from 'vitest'

import { isActiveMembership } from './membership'

describe('isActiveMembership', () => {
  it('membership chưa bị gỡ thì đang hoạt động', () => {
    expect(isActiveMembership({ isAdmin: false, removedAt: null })).toBe(true)
  })

  it('membership đã bị gỡ thì không', () => {
    expect(isActiveMembership({ isAdmin: true, removedAt: new Date('2026-08-01') })).toBe(false)
  })
})
