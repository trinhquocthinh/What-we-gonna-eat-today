import { describe, expect, it } from 'vitest'

import { sessionClosedReason } from './session-openness'

const TODAY = '2026-09-04'

describe('sessionClosedReason (M3-T10 / BR-055)', () => {
  it('phiên ACTIVE của hôm nay vẫn mở', () => {
    expect(sessionClosedReason({ state: 'ACTIVE', decisionDate: TODAY, today: TODAY })).toBeNull()
  })

  // Đây là ca E11 mở ra mà chưa lấp: quét lười chỉ chạy ở Group Hub, nên mở
  // thẳng `/sessions/<id hôm qua>` từ tab cũ vẫn gặp một phiên mang state ACTIVE.
  it('phiên ACTIVE của HÔM QUA đã đóng, dù quét lười chưa chạy', () => {
    expect(sessionClosedReason({ state: 'ACTIVE', decisionDate: '2026-09-03', today: TODAY })).toBe(
      'EXPIRED',
    )
  })

  it('ngày mai chưa tới thì không tính là quá hạn', () => {
    expect(
      sessionClosedReason({ state: 'ACTIVE', decisionDate: '2026-09-05', today: TODAY }),
    ).toBeNull()
  })

  it('mỗi state không-ACTIVE có lý do riêng', () => {
    expect(sessionClosedReason({ state: 'DRAFT', decisionDate: TODAY, today: TODAY })).toBe(
      'NOT_STARTED',
    )
    expect(sessionClosedReason({ state: 'FINALIZED', decisionDate: TODAY, today: TODAY })).toBe(
      'FINALIZED',
    )
    expect(sessionClosedReason({ state: 'INVALID', decisionDate: TODAY, today: TODAY })).toBe(
      'INVALID',
    )
  })

  // State đã ghi vào DB thắng phép so ngày: một phiên hôm qua ĐÃ CHỐT phải đọc
  // là "đã chốt", không phải "hết hạn" — nó có Final Meal để xem.
  it('phiên FINALIZED của hôm qua đọc là FINALIZED, không phải EXPIRED', () => {
    expect(
      sessionClosedReason({ state: 'FINALIZED', decisionDate: '2026-09-03', today: TODAY }),
    ).toBe('FINALIZED')
  })
})
