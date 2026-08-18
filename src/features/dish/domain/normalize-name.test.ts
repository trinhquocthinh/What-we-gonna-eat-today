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
    expect(normalizeDishName('Gà\tchiên\nnước mắm')).toBe('gà chiên nước mắm')
  })

  // E2-T3 SẼ LẬT TEST NÀY. Nó tồn tại để "chưa bỏ dấu" là một quyết định có chữ
  // ký, không phải một thiếu sót ai đó vô tình vá.
  it('E1 CỐ Ý chưa bỏ dấu — E2-T3 đổi kỳ vọng này thành toBe', () => {
    expect(normalizeDishName('Cá kho')).not.toBe(normalizeDishName('Ca kho'))
  })
})
