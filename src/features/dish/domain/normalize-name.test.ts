import { describe, expect, it } from 'vitest'

import { collapseDishName, normalizeDishName } from './normalize-name'

describe('SPEC-005 — chuẩn hoá tên món (mức 1)', () => {
  it('SPEC-005: gộp khoảng trắng liên tiếp và cắt hai đầu', () => {
    expect(normalizeDishName('  Canh   Chua  ')).toBe('canh chua')
  })

  it('SPEC-005: dạng hiển thị giữ nguyên hoa/thường', () => {
    expect(collapseDishName('  Canh   Chua  ')).toBe('Canh Chua')
  })

  it('SPEC-005: NFC gộp dấu tổ hợp với ký tự dựng sẵn', () => {
    // 'Cá' gõ bằng 'C' + 'a' + U+0301 phải bằng 'Cá' dựng sẵn.
    expect(normalizeDishName('Ca\u0301 basa kho tiêu')).toBe(normalizeDishName('Cá basa kho tiêu'))
  })

  it('SPEC-005: coi tab và xuống dòng là khoảng trắng', () => {
    expect(normalizeDishName('Gà\tchiên\nnước mắm')).toBe('ga chien nuoc mam')
  })

  it('TC-098 — bỏ dấu tiếng Việt, "Ca kho" và "Cá kho" cùng normalized_name', () => {
    expect(normalizeDishName('Ca kho')).toBe(normalizeDishName('Cá kho'))
    expect(normalizeDishName('Cá kho')).toBe('ca kho')
  })

  it('bỏ dấu cho nguyên âm có dấu mũ + thanh điệu cùng lúc', () => {
    expect(normalizeDishName('Phở bò')).toBe('pho bo')
    expect(normalizeDishName('Bún đậu')).toBe('bun dau')
  })

  it('giữ nguyên chữ không dấu', () => {
    expect(normalizeDishName('Kho quet')).toBe('kho quet')
  })
})
