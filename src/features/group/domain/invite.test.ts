import { describe, expect, it } from 'vitest'

import { isInviteExpired } from './invite'

describe('isInviteExpired', () => {
  it('chưa hết hạn khi now < expiresAt', () => {
    const expiresAt = new Date('2026-08-25T00:00:00Z')
    const now = new Date('2026-08-24T23:59:59Z')
    expect(isInviteExpired(expiresAt, now)).toBe(false)
  })

  it('TC-112 — hết hạn ĐÚNG lúc expiresAt (biên đóng)', () => {
    const expiresAt = new Date('2026-08-25T00:00:00Z')
    expect(isInviteExpired(expiresAt, expiresAt)).toBe(true)
  })

  it('hết hạn khi now > expiresAt', () => {
    const expiresAt = new Date('2026-08-25T00:00:00Z')
    const now = new Date('2026-08-25T00:00:01Z')
    expect(isInviteExpired(expiresAt, now)).toBe(true)
  })
})
