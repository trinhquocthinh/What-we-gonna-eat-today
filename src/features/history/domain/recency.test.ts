import { describe, expect, it } from 'vitest'

import { computeRecencyPenalty, daysSinceLastEaten } from './recency'

const WINDOW = 7
const TODAY = '2026-08-19'

function penaltyAfter(days: number): number {
  // Dựng ngày ăn cách `TODAY` đúng `days` ngày, không hardcode từng chuỗi.
  const eaten = new Date(Date.UTC(2026, 7, 19) - days * 86_400_000).toISOString().slice(0, 10)
  return computeRecencyPenalty({
    eatingDates: [eaten],
    referenceDate: TODAY,
    cooldownWindowDays: WINDOW,
  })
}

describe('computeRecencyPenalty', () => {
  it('TC-079 — ăn hôm nay (d = 0): R = 1.0', () => {
    expect(penaltyAfter(0)).toBe(1)
  })

  it('TC-080 — ăn 3 ngày trước (d = 3): R ≈ 0.57', () => {
    expect(penaltyAfter(3)).toBeCloseTo(0.57, 2)
  })

  it('TC-081 — ăn đúng 7 ngày trước (d = 7): R = 0.0 (biên đóng)', () => {
    expect(penaltyAfter(7)).toBe(0)
  })

  it('TC-082 — ăn 20 ngày trước (d = 20): R = 0.0, không âm', () => {
    expect(penaltyAfter(20)).toBe(0)
  })

  it('TC-083 — chưa từng ăn: R = 0.0', () => {
    expect(
      computeRecencyPenalty({ eatingDates: [], referenceDate: TODAY, cooldownWindowDays: WINDOW }),
    ).toBe(0)
  })

  it('TC-084 — hai bản ghi cùng món cùng ngày: collapse thành một lần ăn', () => {
    const once = computeRecencyPenalty({
      eatingDates: ['2026-08-19'],
      referenceDate: TODAY,
      cooldownWindowDays: WINDOW,
    })
    const twice = computeRecencyPenalty({
      eatingDates: ['2026-08-19', '2026-08-19'],
      referenceDate: TODAY,
      cooldownWindowDays: WINDOW,
    })

    expect(twice).toBe(once)
    expect(twice).toBe(1)
  })

  it('khớp trọn bảng giá trị Ranking Spec §2.2', () => {
    expect(penaltyAfter(0)).toBeCloseTo(1.0, 2)
    expect(penaltyAfter(1)).toBeCloseTo(0.86, 2)
    expect(penaltyAfter(3)).toBeCloseTo(0.57, 2)
    expect(penaltyAfter(6)).toBeCloseTo(0.14, 2)
    expect(penaltyAfter(7)).toBeCloseTo(0.0, 2)
  })

  it('nhiều ngày khác nhau: lấy lần ăn GẦN NHẤT', () => {
    expect(
      computeRecencyPenalty({
        eatingDates: ['2026-08-01', '2026-08-18', '2026-07-15'],
        referenceDate: TODAY,
        cooldownWindowDays: WINDOW,
      }),
    ).toBeCloseTo(0.86, 2) // d = 1, không phải d = 18 hay d = 35
  })

  it('ngày ăn muộn hơn referenceDate: chặn trên tại 1, không vượt hợp đồng R ∈ [0,1]', () => {
    expect(
      computeRecencyPenalty({
        eatingDates: ['2026-08-22'],
        referenceDate: TODAY,
        cooldownWindowDays: WINDOW,
      }),
    ).toBe(1)
  })
})

describe('daysSinceLastEaten', () => {
  it('chưa từng ăn trả null, không phải 0 — 0 nghĩa là "ăn hôm nay"', () => {
    expect(daysSinceLastEaten({ eatingDates: [], referenceDate: TODAY })).toBeNull()
    expect(daysSinceLastEaten({ eatingDates: [TODAY], referenceDate: TODAY })).toBe(0)
  })

  it('đúng qua ranh giới tháng và năm nhuận', () => {
    expect(daysSinceLastEaten({ eatingDates: ['2026-07-31'], referenceDate: '2026-08-03' })).toBe(3)
    expect(daysSinceLastEaten({ eatingDates: ['2024-02-28'], referenceDate: '2024-03-01' })).toBe(2)
    expect(daysSinceLastEaten({ eatingDates: ['2026-12-30'], referenceDate: '2027-01-02' })).toBe(3)
  })

  it('ngày không hợp lệ thì ném RangeError, không trả NaN im lặng', () => {
    expect(() =>
      daysSinceLastEaten({ eatingDates: ['khong-phai-ngay'], referenceDate: TODAY }),
    ).toThrow(RangeError)
  })
})
