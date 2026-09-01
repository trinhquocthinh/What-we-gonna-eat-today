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
  it('trong cửa sổ cooldown (R > 0): câu "vừa ăn gần đây" thắng kể cả khi lane là EXPLORE', () => {
    expect(formatExplanation(0, 'EXPLOIT')).toBe('Vừa ăn gần đây.')
    expect(formatExplanation(3, 'EXPLORE')).toBe('Vừa ăn gần đây.')
    expect(formatExplanation(6, 'EXPLOIT')).toBe('Vừa ăn gần đây.')
  })

  it('lane EXPLORE, chưa từng ăn (d = null): "Nhà mình chưa ăn món này bao giờ."', () => {
    expect(formatExplanation(null, 'EXPLORE')).toBe('Nhà mình chưa ăn món này bao giờ.')
  })

  it('lane EXPLORE, đã lâu chưa ăn (d >= 7): "Đã N ngày chưa ăn — thử đổi vị?"', () => {
    expect(formatExplanation(45, 'EXPLORE')).toBe('Đã 45 ngày chưa ăn — thử đổi vị?')
    expect(formatExplanation(7, 'EXPLORE')).toBe('Đã 7 ngày chưa ăn — thử đổi vị?')
  })

  it('lane EXPLOIT, ngoài cửa sổ cooldown hoặc chưa từng ăn: câu trung tính', () => {
    expect(formatExplanation(7, 'EXPLOIT')).toBe('Món này đang có trong danh mục của nhóm.')
    expect(formatExplanation(45, 'EXPLOIT')).toBe('Món này đang có trong danh mục của nhóm.')
    expect(formatExplanation(null, 'EXPLOIT')).toBe('Món này đang có trong danh mục của nhóm.')
  })
})
