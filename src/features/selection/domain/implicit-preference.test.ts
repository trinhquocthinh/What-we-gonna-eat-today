import { describe, expect, it } from 'vitest'

import type { ImplicitSwipe } from './implicit-preference'
import { computeImplicitPreference } from './implicit-preference'
import { RANKING_CONFIG } from './ranking-config'

const DISH = 'dish-pho'
const REFERENCE = '2026-09-05'

function swipe(overrides: Partial<ImplicitSwipe> = {}): ImplicitSwipe {
  return {
    globalDishId: DISH,
    type: 'SWIPE_RIGHT',
    decisionDate: REFERENCE,
    ...overrides,
  }
}

/** Đọc $I$ của một món; món không có lượt vuốt nào KHÔNG có mặt trong Map. */
function scoreOf(swipes: readonly ImplicitSwipe[], dishId = DISH): number | undefined {
  return computeImplicitPreference({ swipes, referenceDate: REFERENCE }, RANKING_CONFIG).get(dishId)
}

describe('computeImplicitPreference', () => {
  it('TC-159 — một Swipe Right hôm nay cho I = 0.25, KHÔNG phải 1.0', () => {
    // $K_{prior} = 3$ giữ một mẫu đơn lẻ khỏi nói to: 1 / (1 + 0 + 3).
    expect(scoreOf([swipe()])).toBeCloseTo(0.25, 10)
  })

  it('TC-160 — lượt cách đúng 60 ngày đóng góp trọng số 0.5, lượt hôm nay đóng góp 1.0', () => {
    // 2026-09-05 trừ 60 ngày = 2026-07-07. Mốc phân rã của RANKING_CONFIG.implicit.
    const old = scoreOf([swipe({ decisionDate: '2026-07-07' })])
    const fresh = scoreOf([swipe()])

    expect(old).toBeCloseTo(0.5 / (0.5 + 3), 10)
    expect(fresh).toBeCloseTo(1 / (1 + 3), 10)

    // Và cộng lại: $R_w = 1.5$, $I = 1.5 / (1.5 + 3) = 1/3$.
    expect(scoreOf([swipe(), swipe({ decisionDate: '2026-07-07' })])).toBeCloseTo(1 / 3, 10)
  })

  it('TC-160 — sai HALF_LIFE_DAYS thì ca này đỏ: 120 ngày cho đúng 0.25', () => {
    // Hai chu kỳ bán rã. Ca canh thêm một điểm trên đường cong, vì một điểm
    // duy nhất khớp được với nhiều hằng số khác nhau.
    expect(scoreOf([swipe({ decisionDate: '2026-05-08' })])).toBeCloseTo(0.25 / (0.25 + 3), 10)
  })

  it('TC-161 — không có lượt vuốt nào: Map rỗng, người gọi dùng ?? 0 (KHÔNG phải NaN)', () => {
    const result = computeImplicitPreference(
      { swipes: [], referenceDate: REFERENCE },
      RANKING_CONFIG,
    )

    expect(result.size).toBe(0)
    expect(result.get(DISH) ?? 0).toBe(0)
    expect(Number.isNaN(result.get(DISH) ?? 0)).toBe(false)
  })

  it('TC-162 — Rw = Lw cho I = 0, trung tính, không nghiêng bên nào', () => {
    expect(scoreOf([swipe(), swipe({ type: 'SWIPE_LEFT' })])).toBe(0)
  })

  it('TC-162 — chỉ Swipe Left cho I âm, chặn dưới bởi cùng mẫu số', () => {
    expect(scoreOf([swipe({ type: 'SWIPE_LEFT' })])).toBeCloseTo(-0.25, 10)
  })

  it('gộp theo globalDishId — mỗi món một điểm riêng', () => {
    const result = computeImplicitPreference(
      {
        swipes: [swipe(), swipe(), swipe({ globalDishId: 'dish-bun', type: 'SWIPE_LEFT' })],
        referenceDate: REFERENCE,
      },
      RANKING_CONFIG,
    )

    expect(result.get(DISH)).toBeCloseTo(2 / 5, 10)
    expect(result.get('dish-bun')).toBeCloseTo(-0.25, 10)
  })

  it('I nằm trong [-1, 1] kể cả khi số lượt vuốt rất lớn', () => {
    const many = Array.from({ length: 500 }, () => swipe())
    const score = scoreOf(many)!

    expect(score).toBeGreaterThan(0.99)
    expect(score).toBeLessThan(1)
  })

  it('decision_date ở TƯƠNG LAI không cho trọng số > 1 — hợp đồng I ∈ [-1, 1]', () => {
    // Lệch timezone giữa hai nhóm sinh ra ca này. `ageDays` bị chặn dưới ở 0,
    // nên lượt "ngày mai" đóng góp đúng bằng lượt hôm nay chứ không hơn.
    expect(scoreOf([swipe({ decisionDate: '2026-09-06' })])).toBeCloseTo(0.25, 10)
  })

  it('ngày không hợp lệ ném RangeError chứ không lặng lẽ cho NaN', () => {
    expect(() => scoreOf([swipe({ decisionDate: 'hôm qua' })])).toThrow(RangeError)
  })
})
