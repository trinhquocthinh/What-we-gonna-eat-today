import { describe, expect, it } from 'vitest'

import { messageFor } from './messages'

describe('messageFor', () => {
  // Bảng phải ĐẦY ĐỦ. `satisfies` đã ép ở mức kiểu; ca này ép ở mức hành vi:
  // không mã nào trả về chuỗi rỗng hoặc chính tên mã.
  it.each([
    'ERR_UNAUTHENTICATED',
    'ERR_NOT_GROUP_MEMBER',
    'ERR_NOT_GROUP_ADMIN',
    'ERR_NOT_SESSION_CREATOR',
    'ERR_NOT_PARTICIPANT',
    'ERR_VALIDATION',
    'ERR_INVITE_INVALID',
    'ERR_INVITE_ALREADY_USED',
    'ERR_ALREADY_GROUP_MEMBER',
    'ERR_DISH_ALREADY_IN_POOL',
    'ERR_DISH_NOT_IN_POOL',
    'ERR_INVALID_SYSTEM_TAG',
    'ERR_SESSION_EXISTS_TODAY',
    'ERR_SESSION_NOT_DRAFT',
    'ERR_SESSION_NOT_ACTIVE',
    'ERR_PARTICIPANT_NOT_MEMBER',
    'ERR_PARTICIPANT_EXISTS',
    'ERR_DUPLICATE_DISH_IN_MEAL',
    'ERR_EMPTY_FINAL_MEAL',
    'ERR_REQUIRED_RULE_FAILED',
    'ERR_DUPLICATE_RULE',
    'ERR_INVALID_MINIMUM_COUNT',
    'ERR_GROUP_HAS_NO_DISH',
  ] as const)('%s có câu tiếng Việt tử tế', (code) => {
    const message = messageFor({ code })

    expect(message.length).toBeGreaterThan(8)
    expect(message).not.toContain('ERR_')
    expect(message).toMatch(/[.]$/)
    expect(message).not.toContain('!') // Design Criteria §2 — không dấu chấm than
  })

  it('ERR_VALIDATION phân biệt tên món với tên nhóm', () => {
    expect(messageFor({ code: 'ERR_VALIDATION', details: { field: 'dishName' } })).toBe(
      'Nhập tên món trước đã.',
    )
    expect(messageFor({ code: 'ERR_VALIDATION', details: { field: 'groupName' } })).toBe(
      'Đặt tên để cả nhà nhận ra nhóm.',
    )
  })

  it('ERR_VALIDATION với field lạ rơi về câu chung', () => {
    expect(messageFor({ code: 'ERR_VALIDATION', details: { field: 'cursor' } })).toBe(
      'Kiểm tra lại thông tin vừa nhập giúp mình.',
    )
  })

  it('ERR_REQUIRED_RULE_FAILED nêu đúng món còn thiếu', () => {
    const message = messageFor({
      code: 'ERR_REQUIRED_RULE_FAILED',
      details: { shortfalls: [{ systemTag: 'SOUP', missing: 1 }] },
    })

    expect(message).toBe('Còn thiếu 1 món canh.')
  })

  it('ERR_REQUIRED_RULE_FAILED nối hai món bằng "và"', () => {
    const message = messageFor({
      code: 'ERR_REQUIRED_RULE_FAILED',
      details: {
        shortfalls: [
          { systemTag: 'MAIN', missing: 1 },
          { systemTag: 'SOUP', missing: 2 },
        ],
      },
    })

    expect(message).toBe('Còn thiếu 1 món mặn và 2 món canh.')
  })

  it('ERR_REQUIRED_RULE_FAILED không có shortfalls thì rơi về câu chung', () => {
    expect(messageFor({ code: 'ERR_REQUIRED_RULE_FAILED' })).toBe('Mâm cơm còn thiếu món bắt buộc.')
  })
})
