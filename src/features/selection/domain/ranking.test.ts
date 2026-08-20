import { describe, expect, it } from 'vitest'

import { buildDeck, computePersonalScore, stableHash } from './ranking'
import { RANKING_CONFIG } from './ranking-config'

const SEED = { sessionId: 'sess-1', userId: 'user-1' }

function dish(dishId: string, daysSinceLastEaten: number | null, recencyPenalty: number) {
  return { dishId, daysSinceLastEaten, recencyPenalty }
}

describe('computePersonalScore', () => {
  it('v1.0 chỉ có số hạng recency: score = −0.25 × R', () => {
    expect(computePersonalScore({ recencyPenalty: 1 }, RANKING_CONFIG)).toBeCloseTo(-0.25, 6)
    expect(computePersonalScore({ recencyPenalty: 0 }, RANKING_CONFIG)).toBe(-0)
  })

  it('R càng lớn điểm càng thấp — món vừa ăn bị đẩy xuống', () => {
    const justEaten = computePersonalScore({ recencyPenalty: 1 }, RANKING_CONFIG)
    const longAgo = computePersonalScore({ recencyPenalty: 0 }, RANKING_CONFIG)
    expect(longAgo).toBeGreaterThan(justEaten)
  })
})

describe('buildDeck', () => {
  it('TC-043 — chưa từng ăn B xếp trên A vừa ăn hôm qua', () => {
    const order = buildDeck(
      { ...SEED, eligible: [dish('A', 1, 0.857), dish('B', null, 0)] },
      RANKING_CONFIG,
    )

    expect(order).toEqual(['B', 'A'])
  })

  it('TC-042 — hai user khác lịch sử ăn cho ra thứ tự khác nhau', () => {
    // Cùng tập món, nhưng lịch sử ăn khác nhau nên `recencyPenalty` khác nhau.
    const orderUser1 = buildDeck(
      {
        sessionId: 'sess-1',
        userId: 'user-1',
        eligible: [dish('A', 0, 1), dish('B', null, 0)],
      },
      RANKING_CONFIG,
    )
    const orderUser2 = buildDeck(
      {
        sessionId: 'sess-1',
        userId: 'user-2',
        eligible: [dish('A', null, 0), dish('B', 0, 1)],
      },
      RANKING_CONFIG,
    )

    expect(orderUser1).toEqual(['B', 'A'])
    expect(orderUser2).toEqual(['A', 'B'])
  })

  it('cùng score (R = 0): món lâu chưa ăn hơn lên trước', () => {
    const order = buildDeck(
      { ...SEED, eligible: [dish('gan', 8, 0), dish('lau', 40, 0), dish('chua-an', null, 0)] },
      RANKING_CONFIG,
    )

    expect(order).toEqual(['chua-an', 'lau', 'gan'])
  })

  it('hoà hoàn toàn (cùng chưa ăn bao giờ): thứ tự XÁC ĐỊNH, lặp lại y hệt', () => {
    const eligible = [dish('x', null, 0), dish('y', null, 0), dish('z', null, 0)]

    const first = buildDeck({ ...SEED, eligible }, RANKING_CONFIG)
    const second = buildDeck({ ...SEED, eligible: [...eligible].reverse() }, RANKING_CONFIG)

    expect(first).toEqual(second) // không phụ thuộc thứ tự đầu vào
    expect(new Set(first).size).toBe(3) // không mất món nào
  })

  it('không sửa mảng đầu vào', () => {
    const eligible = [dish('A', 0, 1), dish('B', null, 0)]
    const snapshot = eligible.map((d) => d.dishId)

    buildDeck({ ...SEED, eligible }, RANKING_CONFIG)

    expect(eligible.map((d) => d.dishId)).toEqual(snapshot)
  })

  it('danh sách rỗng: trả mảng rỗng, không ném (TC-102 ở tầng D)', () => {
    expect(buildDeck({ ...SEED, eligible: [] }, RANKING_CONFIG)).toEqual([])
  })
})

describe('stableHash', () => {
  it('xác định: cùng seed cho cùng giá trị', () => {
    expect(stableHash('a:b:c')).toBe(stableHash('a:b:c'))
  })

  it('nhạy với từng thành phần của seed', () => {
    expect(stableHash('s1:u1:d1')).not.toBe(stableHash('s1:u2:d1'))
    expect(stableHash('s1:u1:d1')).not.toBe(stableHash('s1:u1:d2'))
  })

  it('luôn là số nguyên không âm 32-bit', () => {
    for (const seed of ['', 'a', 'sess:user:dish', 'x'.repeat(200)]) {
      const h = stableHash(seed)
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(0xffffffff)
    }
  })
})
