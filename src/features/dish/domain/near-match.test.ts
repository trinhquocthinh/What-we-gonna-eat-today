import { describe, expect, it } from 'vitest'

import { findNearMatches } from './near-match'

const DISHES = [
  { id: '1', name: 'Canh chua cá lóc' },
  { id: '2', name: 'Cá basa kho tiêu' },
  { id: '3', name: 'Gà chiên nước mắm' },
]

describe('findNearMatches', () => {
  it('chuỗi gõ vào NẰM TRONG tên món', () => {
    expect(findNearMatches(DISHES, 'canh chua').map((d) => d.id)).toEqual(['1'])
  })

  it('tên món NẰM TRONG chuỗi gõ vào — chiều ngược lại', () => {
    const dishes = [{ id: '1', name: 'Canh chua' }]
    expect(findNearMatches(dishes, 'canh chua cá lóc nấu me').map((d) => d.id)).toEqual(['1'])
  })

  it('khớp chính xác cũng được tính', () => {
    expect(findNearMatches(DISHES, 'Gà chiên nước mắm').map((d) => d.id)).toEqual(['3'])
  })

  it('dưới 3 ký tự thì không trả gì — tránh bới cả danh mục', () => {
    expect(findNearMatches(DISHES, 'cá')).toEqual([])
  })

  it('không khớp thì rỗng', () => {
    expect(findNearMatches(DISHES, 'bún bò Huế')).toEqual([])
  })

  it('tối đa 3 ứng viên', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: String(i), name: `Canh chua ${i}` }))
    expect(findNearMatches(many, 'canh chua')).toHaveLength(3)
  })

  // Chỉ pass SAU KHI E2-T3 (S2) đã bỏ dấu trong normalizeDishName.
  it('bỏ dấu: gõ không dấu vẫn ra món có dấu', () => {
    expect(findNearMatches(DISHES, 'canh chua ca loc').map((d) => d.id)).toEqual(['1'])
  })
})
