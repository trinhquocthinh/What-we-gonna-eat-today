import { describe, expect, it } from 'vitest'

import type { SessionRule } from './evaluate'
import { evaluateRules } from './evaluate'

const MAIN: SessionRule = { systemTag: 'MAIN', minimumCount: 1, ruleType: 'REQUIRED' }
const SOUP: SessionRule = { systemTag: 'SOUP', minimumCount: 1, ruleType: 'REQUIRED' }
const PREF_SOUP: SessionRule = { systemTag: 'SOUP', minimumCount: 1, ruleType: 'PREFERRED' }

describe('evaluateRules (E10-T2)', () => {
  // TC-073 — Independent Tag Counting cho REQUIRED, SDD §8.
  it('một món mang cả MAIN và SOUP thoả CẢ HAI rule REQUIRED', () => {
    const result = evaluateRules({
      rules: [MAIN, SOUP],
      dishes: [{ systemTags: ['MAIN', 'SOUP'] }], // Bò kho bánh mì
      targetDishCount: null,
    })

    expect(result).toEqual({ blocking: [], warnings: [] })
  })

  // TC-072 — thiếu canh.
  it('trả blocking shortfall khi nháp thiếu món canh REQUIRED', () => {
    const result = evaluateRules({
      rules: [SOUP],
      dishes: [{ systemTags: ['MAIN'] }, { systemTags: ['SIDE'] }],
      targetDishCount: null,
    })

    expect(result).toEqual({
      blocking: [{ systemTag: 'SOUP', minimumCount: 1, actual: 0, missing: 1 }],
      warnings: [],
    })
  })

  // TC-110 — Rule Set rỗng.
  it('Rule Set rỗng thì luôn thoả', () => {
    const result = evaluateRules({
      rules: [],
      dishes: [{ systemTags: [] }],
      targetDishCount: null,
    })

    expect(result).toEqual({ blocking: [], warnings: [] })
  })

  it('nháp rỗng và Rule Set rỗng cũng thoả', () => {
    expect(evaluateRules({ rules: [], dishes: [], targetDishCount: null })).toEqual({
      blocking: [],
      warnings: [],
    })
  })

  it('đếm đủ số lượng khi minimumCount lớn hơn 1', () => {
    const result = evaluateRules({
      rules: [{ systemTag: 'MAIN', minimumCount: 2, ruleType: 'REQUIRED' }],
      dishes: [{ systemTags: ['MAIN'] }],
      targetDishCount: null,
    })

    expect(result.blocking).toEqual([{ systemTag: 'MAIN', minimumCount: 2, actual: 1, missing: 1 }])
    expect(result.warnings).toEqual([])
  })

  it('món không mang tag nào không đóng góp cho rule nào', () => {
    const result = evaluateRules({
      rules: [MAIN],
      dishes: [{ systemTags: [] }],
      targetDishCount: null,
    })

    expect(result.blocking).toHaveLength(1)
  })

  it('giữ nguyên thứ tự rule trong blocking', () => {
    const result = evaluateRules({
      rules: [SOUP, MAIN],
      dishes: [],
      targetDishCount: null,
    })

    expect(result.blocking.map((s) => s.systemTag)).toEqual(['SOUP', 'MAIN'])
  })

  it('hai món hai tag chồng nhau vẫn thoả ba rule', () => {
    const result = evaluateRules({
      rules: [MAIN, SOUP, { systemTag: 'SIDE', minimumCount: 1, ruleType: 'REQUIRED' }],
      dishes: [{ systemTags: ['MAIN', 'SOUP'] }, { systemTags: ['SOUP', 'SIDE'] }],
      targetDishCount: null,
    })

    expect(result).toEqual({ blocking: [], warnings: [] })
  })

  // TC-139: Thiếu 1 REQUIRED và 1 PREFERRED → blocking có đúng 1, warnings có đúng 1
  it('TC-139: thiếu 1 REQUIRED và 1 PREFERRED -> blocking có 1, warnings có 1; món 2 tag đóng góp cả hai', () => {
    // Thiếu cả 2
    const shortfallBoth = evaluateRules({
      rules: [MAIN, PREF_SOUP],
      dishes: [{ systemTags: ['SIDE'] }],
      targetDishCount: null,
    })
    expect(shortfallBoth.blocking).toEqual([
      { systemTag: 'MAIN', minimumCount: 1, actual: 0, missing: 1 },
    ])
    expect(shortfallBoth.warnings).toEqual([
      {
        kind: 'PREFERRED_SHORTFALL',
        systemTag: 'SOUP',
        minimumCount: 1,
        actual: 0,
        missing: 1,
      },
    ])

    // Món 2 tag (MAIN + SOUP) đóng góp đồng thời cho cả REQUIRED MAIN lẫn PREFERRED SOUP
    const satisfiedBoth = evaluateRules({
      rules: [MAIN, PREF_SOUP],
      dishes: [{ systemTags: ['MAIN', 'SOUP'] }],
      targetDishCount: null,
    })
    expect(satisfiedBoth.blocking).toEqual([])
    expect(satisfiedBoth.warnings).toEqual([])
  })

  // TC-143: target = 4, nháp 6 món -> warnings có TARGET_COUNT direction: OVER; blocking rỗng
  it('TC-143: target = 4, nháp 6 món -> warnings có TARGET_COUNT direction: OVER; blocking rỗng', () => {
    const result = evaluateRules({
      rules: [],
      dishes: Array.from({ length: 6 }, () => ({ systemTags: [] })),
      targetDishCount: 4,
    })

    expect(result.blocking).toEqual([])
    expect(result.warnings).toEqual([
      {
        kind: 'TARGET_COUNT',
        direction: 'OVER',
        target: 4,
        actual: 6,
      },
    ])
  })

  // TC-144: target = null -> không sinh cảnh báo nào
  it('TC-144: target = null -> không sinh cảnh báo nào', () => {
    const result = evaluateRules({
      rules: [],
      dishes: Array.from({ length: 6 }, () => ({ systemTags: [] })),
      targetDishCount: null,
    })

    expect(result.blocking).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('target = 4, nháp 4 món -> không cảnh báo', () => {
    const result = evaluateRules({
      rules: [],
      dishes: Array.from({ length: 4 }, () => ({ systemTags: [] })),
      targetDishCount: 4,
    })

    expect(result.blocking).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('target = 4, nháp 2 món -> warnings có TARGET_COUNT direction: UNDER', () => {
    const result = evaluateRules({
      rules: [],
      dishes: Array.from({ length: 2 }, () => ({ systemTags: [] })),
      targetDishCount: 4,
    })

    expect(result.blocking).toEqual([])
    expect(result.warnings).toEqual([
      {
        kind: 'TARGET_COUNT',
        direction: 'UNDER',
        target: 4,
        actual: 2,
      },
    ])
  })
})
