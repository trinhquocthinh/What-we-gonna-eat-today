import { describe, expect, it } from 'vitest'

import { generateInviteToken, hashInviteToken } from './invite-token'

describe('generateInviteToken', () => {
  it('sinh token khác nhau mỗi lần gọi', () => {
    expect(generateInviteToken()).not.toBe(generateInviteToken())
  })

  it('không chứa ký tự cần encode trong URL', () => {
    expect(generateInviteToken()).toMatch(/^[A-Za-z0-9_-]+$/u)
  })
})

describe('hashInviteToken', () => {
  it('cùng token cho cùng hash (để tra cứu bằng hash)', () => {
    const token = generateInviteToken()
    expect(hashInviteToken(token)).toBe(hashInviteToken(token))
  })

  it('token khác nhau cho hash khác nhau', () => {
    expect(hashInviteToken('a')).not.toBe(hashInviteToken('b'))
  })
})
