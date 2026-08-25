import { describe, expect, it } from 'vitest'
import { eatingDayLabel } from './eating-day-label'

describe('eatingDayLabel', () => {
  it('hôm nay: thêm tiền tố "Hôm nay · "', () => {
    expect(eatingDayLabel('2026-08-16', '2026-08-16')).toBe('Hôm nay · Chủ Nhật 16/8')
  })

  it('hôm qua: thêm tiền tố "Hôm qua · "', () => {
    expect(eatingDayLabel('2026-08-15', '2026-08-16')).toBe('Hôm qua · Thứ Bảy 15/8')
  })

  it('các ngày trước đó: chỉ hiện thứ và ngày/tháng', () => {
    expect(eatingDayLabel('2026-08-13', '2026-08-16')).toBe('Thứ Năm 13/8')
  })

  it('xử lý đúng khi hôm qua là ngày cuối của tháng trước (chuyển tháng)', () => {
    // 2026-09-01 là Thứ Ba, 2026-08-31 là Thứ Hai
    expect(eatingDayLabel('2026-08-31', '2026-09-01')).toBe('Hôm qua · Thứ Hai 31/8')
  })
})
