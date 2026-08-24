import { describe, expect, it } from 'vitest'
import { formatVietnameseTime } from './format-vietnamese-time'

describe('formatVietnameseTime', () => {
  it('quy đổi sang giờ Việt Nam, không phải giờ UTC', () => {
    expect(formatVietnameseTime(new Date('2026-08-16T10:42:00Z'), 'Asia/Ho_Chi_Minh')).toBe('17:42')
  })

  it('nửa đêm ra 00:05 chứ không phải 24:05', () => {
    expect(formatVietnameseTime(new Date('2026-08-16T17:05:00Z'), 'Asia/Ho_Chi_Minh')).toBe('00:05')
  })

  it('cùng thời điểm ở múi giờ khác cho giờ khác', () => {
    const instant = new Date('2026-08-16T10:42:00Z')
    expect(formatVietnameseTime(instant, 'Asia/Tokyo')).toBe('19:42')
  })

  it('ngày không hợp lệ thì ném', () => {
    expect(() => formatVietnameseTime(new Date('x'), 'Asia/Ho_Chi_Minh')).toThrow(RangeError)
  })
})
