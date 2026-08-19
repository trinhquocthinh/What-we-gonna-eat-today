import { describe, expect, it } from 'vitest'

import { readDishDraft } from './dish-draft'

describe('SPEC-005 — validation của DishDraft', () => {
  it('tên toàn khoảng trắng thì trả về NAME_EMPTY', () => {
    const result = readDishDraft({ name: '   \t\n  ' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('NAME_EMPTY')
    }
  })

  it('120 ký tự thì hợp lệ', () => {
    const result = readDishDraft({ name: 'à'.repeat(120) })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name).toBe('à'.repeat(120))
    }
  })

  it('121 ký tự thì trả về NAME_TOO_LONG', () => {
    const result = readDishDraft({ name: 'à'.repeat(121) })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('NAME_TOO_LONG')
    }
  })

  it('dọn khoảng trắng và trả về name cùng normalizedName', () => {
    const result = readDishDraft({ name: '  Cá basa   kho tiêu ' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name).toBe('Cá basa kho tiêu')
      expect(result.value.normalizedName).toBe('ca basa kho tieu')
    }
  })
})
