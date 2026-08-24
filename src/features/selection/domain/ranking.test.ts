import { describe, expect, it } from 'vitest'

import {
  buildDeck,
  computePersonalScore,
  computeSessionScore,
  rankSession,
  stableHash,
  type SessionDishInput,
} from './ranking'
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

const makeSessionDish = (over: Partial<SessionDishInput> = {}): SessionDishInput => ({
  dishId: 'd1',
  name: 'Cá kho',
  proposedCount: 0,
  rejectedCount: 0,
  recentEaterCount: 0,
  ...over,
})

describe('computeSessionScore', () => {
  // TC-058 — T=4, P=3, N=0, H=0 → 3/4.
  it('TC-058', () => {
    const score = computeSessionScore(
      { proposedCount: 3, rejectedCount: 0, recentEaterCount: 0 },
      4,
      RANKING_CONFIG,
    )
    expect(score).toBeCloseTo(0.75, 5)
  })

  // TC-059 — (3 - 0.7 - 0.6) / 4 = 0.425.
  it('TC-059', () => {
    const score = computeSessionScore(
      { proposedCount: 3, rejectedCount: 1, recentEaterCount: 2 },
      4,
      RANKING_CONFIG,
    )
    expect(score).toBeCloseTo(0.425, 3)
  })

  // TC-060 — thêm người thứ 5, cùng P=3 → 0.6.
  it('TC-060 — chuẩn hoá theo T', () => {
    const score = computeSessionScore(
      { proposedCount: 3, rejectedCount: 0, recentEaterCount: 0 },
      5,
      RANKING_CONFIG,
    )
    expect(score).toBeCloseTo(0.6, 5)
  })

  // TC-111 — T=1, P=1 → 1.0, không chia cho 0.
  it('TC-111 — T = 1', () => {
    const score = computeSessionScore(
      { proposedCount: 1, rejectedCount: 0, recentEaterCount: 0 },
      1,
      RANKING_CONFIG,
    )
    expect(score).toBe(1)
  })

  it('T = 0 trả 0, không NaN', () => {
    const score = computeSessionScore(
      { proposedCount: 1, rejectedCount: 0, recentEaterCount: 0 },
      0,
      RANKING_CONFIG,
    )
    expect(score).toBe(0)
    expect(Number.isNaN(score)).toBe(false)
  })
})

describe('rankSession', () => {
  // TC-061.
  it('món chưa ai tương tác nằm ở untouched, không có điểm', () => {
    const result = rankSession(
      {
        dishes: [
          makeSessionDish({ dishId: 'a', proposedCount: 1 }),
          makeSessionDish({ dishId: 'b' }),
        ],
        participantCount: 2,
      },
      RANKING_CONFIG,
    )

    expect(result.ranked.map((d) => d.dishId)).toEqual(['a'])
    expect(result.untouched.map((d) => d.dishId)).toEqual(['b'])
    expect(result.untouched[0]).not.toHaveProperty('score')
  })

  it('món chỉ bị vuốt trái VẪN nằm trong ranked', () => {
    const result = rankSession(
      { dishes: [makeSessionDish({ dishId: 'a', rejectedCount: 2 })], participantCount: 2 },
      RANKING_CONFIG,
    )

    expect(result.untouched).toEqual([])
    expect(result.ranked[0]?.score).toBeCloseTo(-0.7, 5)
  })

  it('món vừa ăn gần đây nhưng chưa ai vuốt vẫn là untouched', () => {
    const result = rankSession(
      { dishes: [makeSessionDish({ dishId: 'a', recentEaterCount: 3 })], participantCount: 3 },
      RANKING_CONFIG,
    )

    expect(result.untouched.map((d) => d.dishId)).toEqual(['a'])
  })

  it('tie-break tầng 2: cùng điểm thì P cao hơn lên trước', () => {
    // Cặp cho ra CÙNG một số dấu phẩy động, không phải "gần bằng":
    //   z: P=1, N=2, H=1 → 1 - 0.7*2 - 0.3*1 = -0.7
    //   a: P=0, N=1, H=0 → 0 - 0.7*1 - 0.3*0 = -0.7
    // `dishId` cố ý ngược chiều kỳ vọng ('z' > 'a') để ca này KHÔNG pass được
    // nhờ tầng 3.
    const result = rankSession(
      {
        dishes: [
          makeSessionDish({ dishId: 'a', proposedCount: 0, rejectedCount: 1, recentEaterCount: 0 }),
          makeSessionDish({ dishId: 'z', proposedCount: 1, rejectedCount: 2, recentEaterCount: 1 }),
        ],
        participantCount: 4,
      },
      RANKING_CONFIG,
    )

    expect(result.ranked[0]?.score).toBe(result.ranked[1]?.score)
    expect(result.ranked.map((d) => d.dishId)).toEqual(['z', 'a'])
  })

  it('tie-break tầng cuối theo dishId, xác định giữa hai lần gọi', () => {
    const dishes = [
      makeSessionDish({ dishId: 'z', proposedCount: 1 }),
      makeSessionDish({ dishId: 'a', proposedCount: 1 }),
    ]

    expect(
      rankSession({ dishes, participantCount: 2 }, RANKING_CONFIG).ranked.map((d) => d.dishId),
    ).toEqual(['a', 'z'])
    expect(
      rankSession({ dishes, participantCount: 2 }, RANKING_CONFIG).ranked.map((d) => d.dishId),
    ).toEqual(['a', 'z'])
  })
})
