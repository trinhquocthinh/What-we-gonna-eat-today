import { describe, expect, it } from 'vitest'

import { readDishDraft } from './dish-draft'

describe('SPEC-005 — validation của DishDraft', () => {
  it('tên toàn khoảng trắng thì trả về NAME_EMPTY', () => {
    const result = readDishDraft({ name: '   \t\n  ', systemTags: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('NAME_EMPTY')
    }
  })

  it('120 ký tự thì hợp lệ', () => {
    const result = readDishDraft({ name: 'à'.repeat(120), systemTags: [] })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name).toBe('à'.repeat(120))
      expect(result.value.systemTags).toEqual([])
    }
  })

  it('121 ký tự thì trả về NAME_TOO_LONG', () => {
    const result = readDishDraft({ name: 'à'.repeat(121), systemTags: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('NAME_TOO_LONG')
    }
  })

  it('dọn khoảng trắng và trả về name cùng normalizedName và systemTags', () => {
    const result = readDishDraft({ name: '  Cá basa   kho tiêu ', systemTags: ['MAIN', 'SOUP'] })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name).toBe('Cá basa kho tiêu')
      expect(result.value.normalizedName).toBe('ca basa kho tieu')
      expect(result.value.systemTags).toEqual(['MAIN', 'SOUP'])
    }
  })

  it('tag không hợp lệ thì trả về INVALID_SYSTEM_TAG', () => {
    const result = readDishDraft({ name: 'Cá basa kho tiêu', systemTags: ['INVALID_TAG'] })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('INVALID_SYSTEM_TAG')
    }
  })
})
