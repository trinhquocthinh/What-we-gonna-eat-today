import { describe, expect, it } from 'vitest'

import { resolveDecisionDate } from './decision-date'

/**
 * SPEC-018. Không mock gì — `now` là tham số, nên mọi trường hợp biên đều dựng
 * được bằng một hằng số thời điểm.
 */
describe('resolveDecisionDate', () => {
  it('TC-004: 18:30Z ở Asia/Ho_Chi_Minh đã sang ngày hôm sau', () => {
    const now = new Date('2026-08-14T18:30:00Z')
    expect(resolveDecisionDate(now, 'Asia/Ho_Chi_Minh')).toBe('2026-08-15')
  })

  it('TC-005: 16:00Z ở Asia/Ho_Chi_Minh vẫn là ngày hôm đó', () => {
    const now = new Date('2026-08-14T16:00:00Z')
    expect(resolveDecisionDate(now, 'Asia/Ho_Chi_Minh')).toBe('2026-08-14')
  })

  it('đúng 17:00Z là ranh giới nửa đêm của UTC+7', () => {
    // 16:59:59Z → 23:59:59 ngày 14; 17:00:00Z → 00:00:00 ngày 15.
    expect(resolveDecisionDate(new Date('2026-08-14T16:59:59Z'), 'Asia/Ho_Chi_Minh')).toBe(
      '2026-08-14',
    )
    expect(resolveDecisionDate(new Date('2026-08-14T17:00:00Z'), 'Asia/Ho_Chi_Minh')).toBe(
      '2026-08-15',
    )
  })

  it('cùng một thời điểm cho ngày khác nhau ở timezone khác nhau', () => {
    const now = new Date('2026-08-14T18:30:00Z')
    expect(resolveDecisionDate(now, 'Asia/Ho_Chi_Minh')).toBe('2026-08-15')
    expect(resolveDecisionDate(now, 'UTC')).toBe('2026-08-14')
    expect(resolveDecisionDate(now, 'America/Los_Angeles')).toBe('2026-08-14')
  })

  it('giữ zero-padding để so sánh chuỗi trùng với thứ tự ngày', () => {
    expect(resolveDecisionDate(new Date('2026-01-05T03:00:00Z'), 'UTC')).toBe('2026-01-05')
  })

  it('timezone không hợp lệ thì ném lỗi thay vì lặng lẽ dùng mặc định', () => {
    const now = new Date('2026-08-14T18:30:00Z')
    expect(() => resolveDecisionDate(now, 'Asia/Not_A_Place')).toThrow(RangeError)
  })

  it('thời điểm không hợp lệ thì ném lỗi', () => {
    expect(() => resolveDecisionDate(new Date('không phải ngày'), 'UTC')).toThrow(RangeError)
  })
})
