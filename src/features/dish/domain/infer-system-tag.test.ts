import { describe, expect, it } from 'vitest'

import { inferSystemTag } from './infer-system-tag'

describe('inferSystemTag — hai lỗi phân loại đã sửa', () => {
  it('"Canh gà lá giang" là CANH, không phải món mặn', () => {
    // Bỏ dấu biến "cánh gà" và "canh gà" thành cùng "canh ga", nên bản cũ cho
    // MỌI "canh ga " ra MAIN — đúng cho cánh gà nướng, sai cho canh gà thật.
    expect(inferSystemTag('Canh gà lá giang')).toBe('SOUP')
    expect(inferSystemTag('Canh gà nấu nấm')).toBe('SOUP')
  })

  it('"Cánh gà nướng mật ong" vẫn là món mặn', () => {
    expect(inferSystemTag('Cánh gà nướng mật ong')).toBe('MAIN')
    expect(inferSystemTag('Cánh gà chiên nước mắm')).toBe('MAIN')
  })

  it('"Cà pháo muối" là món phụ, không phải món mặn', () => {
    // Tiền tố `ca ` của nhánh MAIN chạy trước SIDE nên nuốt mất `ca phao`.
    expect(inferSystemTag('Cà pháo muối')).toBe('SIDE')
    expect(inferSystemTag('Cà pháo mắm tôm')).toBe('SIDE')
  })
})

describe('inferSystemTag — chuẩn BR-003', () => {
  it.each([
    ['Cơm tấm sườn bì chả', 'STAPLE'],
    ['Bún chả Hà Nội', 'STAPLE'],
    ['Phở bò tái', 'STAPLE'],
    ['Xôi gấc', 'STAPLE'],
    ['Cháo lòng', 'STAPLE'],
    ['Bánh mì thịt nướng', 'STAPLE'],
  ])('%s → STAPLE (món tinh bột, không riêng cơm)', (name, expected) => {
    expect(inferSystemTag(name)).toBe(expected)
  })

  it.each([
    ['Canh chua cá lóc', 'SOUP'],
    ['Lẩu thái hải sản', 'SOUP'],
    ['Súp cua', 'SOUP'],
  ])('%s → SOUP', (name, expected) => {
    expect(inferSystemTag(name)).toBe(expected)
  })

  it.each([
    ['Thịt kho tàu', 'MAIN'],
    ['Cá basa kho tiêu', 'MAIN'],
    ['Bò lúc lắc', 'MAIN'],
    ['Trứng chiên thịt băm', 'MAIN'],
    ['Mực xào chua ngọt', 'MAIN'],
  ])('%s → MAIN', (name, expected) => {
    expect(inferSystemTag(name)).toBe(expected)
  })

  it.each([
    ['Rau muống xào tỏi', 'SIDE'],
    ['Gỏi ngó sen tôm thịt', 'SIDE'],
    ['Dưa cải chua', 'SIDE'],
    ['Kho quẹt', 'SIDE'],
    ['Đậu hũ chiên sả ớt', 'SIDE'],
  ])('%s → SIDE', (name, expected) => {
    expect(inferSystemTag(name)).toBe(expected)
  })

  it.each([
    ['Chè đậu đỏ', 'DESSERT'],
    ['Bánh flan caramel', 'DESSERT'],
    ['Nước mía', 'DESSERT'],
    ['Cà phê sữa đá', 'DESSERT'],
  ])('%s → DESSERT', (name, expected) => {
    expect(inferSystemTag(name)).toBe(expected)
  })

  it('"Bún riêu cua" là món tinh bột chan nước, KHÔNG phải canh', () => {
    expect(inferSystemTag('Bún riêu cua')).toBe('STAPLE')
  })

  it('"Bánh canh cua" là món tinh bột, không phải canh', () => {
    expect(inferSystemTag('Bánh canh cua')).toBe('STAPLE')
  })

  it('tên lạ rơi về MAIN — mâm cơm nào cũng có món mặn', () => {
    expect(inferSystemTag('Món gì đó không đoán được')).toBe('MAIN')
  })

  it('không phụ thuộc hoa/thường hay dấu', () => {
    expect(inferSystemTag('CANH CHUA CÁ LÓC')).toBe('SOUP')
    expect(inferSystemTag('canh chua ca loc')).toBe('SOUP')
  })
})
