import { describe, expect, it } from 'vitest'

import { readDishSearchQuery } from './dish-search-query'

describe('readDishSearchQuery', () => {
  it('bỏ dấu tiếng Việt — gõ không dấu vẫn tra được', () => {
    expect(readDishSearchQuery('Bún chả')).toBe('bun cha')
    expect(readDishSearchQuery('CÁ KHO')).toBe('ca kho')
  })

  it('dưới 3 ký tự trả null — chưa đủ để tra, không phải lỗi', () => {
    expect(readDishSearchQuery('cá')).toBeNull()
    expect(readDishSearchQuery('bú')).toBeNull()
    expect(readDishSearchQuery('')).toBeNull()
    expect(readDishSearchQuery('   ')).toBeNull()
  })

  it('đúng 3 ký tự thì đủ', () => {
    expect(readDishSearchQuery('bún')).toBe('bun')
  })

  it('lọc ký tự đại diện của LIKE — gõ "%" không được khớp cả catalog', () => {
    expect(readDishSearchQuery('%%%%')).toBeNull()
    expect(readDishSearchQuery('bún%')).toBe('bun')
    expect(readDishSearchQuery('b_ún')).toBe('bun')
    expect(readDishSearchQuery('bún\\')).toBe('bun')
  })

  it('gộp khoảng trắng thừa qua normalizeDishName', () => {
    expect(readDishSearchQuery('  bún   chả  ')).toBe('bun cha')
  })
})
