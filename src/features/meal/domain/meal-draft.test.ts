import { describe, expect, it } from 'vitest'

import { readMealDraft } from './meal-draft'

describe('SPEC-015 — Final Meal nháp (domain)', () => {
  it('TC-063: 3 dishId hợp lệ thì nháp chứa đúng 3 món', () => {
    const result = readMealDraft(['dish-1', 'dish-2', 'dish-3'])
    expect(result.ok && result.value.dishIds).toEqual(['dish-1', 'dish-2', 'dish-3'])
  })

  it('TC-064: danh sách chứa dishId trùng thì DUPLICATE_DISH', () => {
    const result = readMealDraft(['dish-1', 'dish-1'])
    expect(result.ok === false && result.error).toBe('DUPLICATE_DISH')
  })

  it('SPEC-015: mảng rỗng hợp lệ ở tầng domain — rỗng chỉ chặn ở Finalize (SPEC-016)', () => {
    expect(readMealDraft([]).ok).toBe(true)
  })
})
