import { describe, expect, it } from 'vitest'

import type { ConstraintFlags } from './constraint-status'
import { constraintStatusText } from './constraint-status'

const NONE: ConstraintFlags = {
  CANNOT_EAT: false,
  BLACKLIST: false,
  HISTORY_WHITELIST: false,
}

describe('constraintStatusText — E13-T7', () => {
  it('chưa khai gì: trả chuỗi rỗng, người gọi không render dòng nào', () => {
    expect(constraintStatusText({ preference: null, flags: NONE })).toBe('')
  })

  it('một cờ: hiện đúng nhãn của cờ đó', () => {
    expect(constraintStatusText({ preference: null, flags: { ...NONE, BLACKLIST: true } })).toBe(
      'Đã tắt gợi ý',
    )
  })

  it('CA THEN CHỐT — ba cờ độc lập cùng bật: hiện CẢ BA, không giấu cái nào', () => {
    // Bản trước E13 là một chuỗi `? :` lồng nhau, và nó sẽ chỉ hiện cờ đầu
    // tiên. `TC-168` khẳng định ba cờ cùng tồn tại được ở tầng dữ liệu; ca này
    // khẳng định màn hình không nói dối về điều đó.
    expect(
      constraintStatusText({
        preference: null,
        flags: { CANNOT_EAT: true, BLACKLIST: true, HISTORY_WHITELIST: true },
      }),
    ).toBe('Không ăn được · Đã tắt gợi ý · Ăn hoài không chán')
  })

  it('TC-170 — Whitelist và Like trực giao: hiện cả hai', () => {
    expect(
      constraintStatusText({
        preference: 'LIKE',
        flags: { ...NONE, HISTORY_WHITELIST: true },
      }),
    ).toBe('Ăn hoài không chán · Đang thích')
  })

  it('Like và Dislike loại trừ nhau nên chỉ một cái xuất hiện', () => {
    expect(constraintStatusText({ preference: 'LIKE', flags: NONE })).toBe('Đang thích')
    expect(constraintStatusText({ preference: 'DISLIKE', flags: NONE })).toBe('Đang không thích')
  })

  it('thứ tự CỐ ĐỊNH, không phụ thuộc thứ tự khai báo trong object', () => {
    const a = constraintStatusText({
      preference: null,
      flags: { HISTORY_WHITELIST: true, CANNOT_EAT: true, BLACKLIST: false },
    })
    const b = constraintStatusText({
      preference: null,
      flags: { BLACKLIST: false, CANNOT_EAT: true, HISTORY_WHITELIST: true },
    })

    expect(a).toBe(b)
    expect(a).toBe('Không ăn được · Ăn hoài không chán')
  })
})
