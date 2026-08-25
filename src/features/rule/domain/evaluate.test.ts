import { describe, expect, it } from 'vitest'

import { evaluateRequired } from './evaluate'

const MAIN = { systemTag: 'MAIN', minimumCount: 1 } as const
const SOUP = { systemTag: 'SOUP', minimumCount: 1 } as const

describe('evaluateRequired', () => {
  // TC-073 — VIẾT TRƯỚC. Independent Tag Counting, SDD §8.
  it('một món mang cả MAIN và SOUP thoả CẢ HAI rule', () => {
    const result = evaluateRequired({
      rules: [MAIN, SOUP],
      dishes: [{ systemTags: ['MAIN', 'SOUP'] }], // Bò kho bánh mì
    })

    expect(result).toEqual({ satisfied: true, shortfalls: [] })
  })

  // TC-072 — thiếu canh.
  it('trả shortfall khi nháp thiếu món canh', () => {
    const result = evaluateRequired({
      rules: [SOUP],
      dishes: [{ systemTags: ['MAIN'] }, { systemTags: ['SIDE'] }],
    })

    expect(result).toEqual({
      satisfied: false,
      shortfalls: [{ systemTag: 'SOUP', minimumCount: 1, actual: 0, missing: 1 }],
    })
  })

  // TC-110 — Rule Set rỗng.
  it('Rule Set rỗng thì luôn thoả', () => {
    const result = evaluateRequired({ rules: [], dishes: [{ systemTags: [] }] })

    expect(result).toEqual({ satisfied: true, shortfalls: [] })
  })

  it('nháp rỗng và Rule Set rỗng cũng thoả', () => {
    expect(evaluateRequired({ rules: [], dishes: [] }).satisfied).toBe(true)
  })

  it('đếm đủ số lượng khi minimumCount lớn hơn 1', () => {
    const result = evaluateRequired({
      rules: [{ systemTag: 'MAIN', minimumCount: 2 }],
      dishes: [{ systemTags: ['MAIN'] }],
    })

    expect(result.shortfalls).toEqual([
      { systemTag: 'MAIN', minimumCount: 2, actual: 1, missing: 1 },
    ])
  })

  it('món không mang tag nào không đóng góp cho rule nào', () => {
    const result = evaluateRequired({ rules: [MAIN], dishes: [{ systemTags: [] }] })

    expect(result.satisfied).toBe(false)
  })

  it('giữ nguyên thứ tự rule trong shortfalls', () => {
    const result = evaluateRequired({
      rules: [SOUP, MAIN],
      dishes: [],
    })

    expect(result.shortfalls.map((s) => s.systemTag)).toEqual(['SOUP', 'MAIN'])
  })

  // Ca chống-hồi-quy cho slot allocation: nếu ai đó "phân bổ" mỗi món cho đúng
  // một rule, ca này sẽ ra satisfied=false.
  it('hai món hai tag chồng nhau vẫn thoả ba rule', () => {
    const result = evaluateRequired({
      rules: [MAIN, SOUP, { systemTag: 'SIDE', minimumCount: 1 }],
      dishes: [{ systemTags: ['MAIN', 'SOUP'] }, { systemTags: ['SOUP', 'SIDE'] }],
    })

    expect(result).toEqual({ satisfied: true, shortfalls: [] })
  })
})
