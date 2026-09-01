import { describe, expect, it } from 'vitest'

import { RANKING_CONFIG } from './ranking-config'

describe('RANKING_CONFIG', () => {
  /**
   * Ranking Spec §5 là hợp đồng đã duyệt. Test này bắt đúng một thứ: ai đó
   * chỉnh một trọng số mà không mở spec ra đọc. Nó không kiểm logic — không có
   * logic nào để kiểm — nên nếu thấy nó "vô nghĩa", hãy thử đổi `wRecency`
   * thành 0.3 và xem nó nói gì.
   */
  it('trọng số khớp Ranking Spec §5', () => {
    expect(RANKING_CONFIG.personalRanking.wRecency).toBe(0.25)
    expect(RANKING_CONFIG.history.cooldownWindowDays).toBe(7)
    expect(RANKING_CONFIG.deck.pageSize).toBe(20)
    expect(RANKING_CONFIG.deck.maxCards).toBe(30)
    expect(RANKING_CONFIG.sessionRanking).toEqual({
      aSwipeRight: 1.0,
      bSwipeLeft: 0.7,
      cCannotEat: 1.0,
      dRecent: 0.3,
    })
  })
})
