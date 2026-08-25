import { describe, expect, it } from 'vitest'

import { formatVietnameseDate, formatVietnameseDateShort } from './format-vietnamese-date'

describe('formatVietnameseDate', () => {
  it('dựng đúng chuỗi header của thiết kế', () => {
    expect(formatVietnameseDate('2026-08-18')).toBe('Thứ Ba · 18 tháng 8')
  })

  it('không zero-pad ngày và tháng', () => {
    expect(formatVietnameseDate('2026-01-01')).toBe('Thứ Năm · 1 tháng 1')
  })

  it('gọi Chủ Nhật đúng tên, không phải "Thứ 1"', () => {
    expect(formatVietnameseDate('2026-08-16')).toBe('Chủ Nhật · 16 tháng 8')
  })

  it('ném lỗi với chuỗi không phải ngày', () => {
    expect(() => formatVietnameseDate('hôm nay')).toThrow(RangeError)
  })
})

describe('formatVietnameseDateShort', () => {
  it('dựng đúng chuỗi header S-09', () => {
    expect(formatVietnameseDateShort('2026-08-18')).toBe('Thứ Ba 18/8')
  })
})
