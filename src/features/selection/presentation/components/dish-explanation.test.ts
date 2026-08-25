import { describe, expect, it } from 'vitest'

import { formatExplanation, formatLastEatenLabel } from './dish-explanation'

describe('formatLastEatenLabel', () => {
  it('chưa từng ăn', () => {
    expect(formatLastEatenLabel(null)).toBe('Chưa từng ăn')
  })
  it('hôm nay và hôm qua có chữ riêng, không phải "0/1 ngày trước"', () => {
    expect(formatLastEatenLabel(0)).toBe('Lần cuối ăn · hôm nay')
    expect(formatLastEatenLabel(1)).toBe('Lần cuối ăn · hôm qua')
  })
  it('từ 2 ngày trở lên: "N ngày trước"', () => {
    expect(formatLastEatenLabel(5)).toBe('Lần cuối ăn · 5 ngày trước')
  })
})

describe('formatExplanation', () => {
  it('trong cửa sổ cooldown (R > 0): câu "vừa ăn gần đây"', () => {
    expect(formatExplanation(0)).toBe('Vừa ăn gần đây.')
    expect(formatExplanation(6)).toBe('Vừa ăn gần đây.')
  })
  it('ngoài cửa sổ hoặc chưa từng ăn: câu trung tính', () => {
    expect(formatExplanation(7)).toBe('Món này đang có trong danh mục của nhóm.')
    expect(formatExplanation(null)).toBe('Món này đang có trong danh mục của nhóm.')
  })
})
