import { describe, expect, it } from 'vitest'

import type { DishCard } from '../../domain/dish-card'
import type { InteractionType } from '../../domain/interaction'
import { resumePosition } from './resume-position'

function makeTestDish(id: string, interaction: InteractionType | null = null): DishCard {
  return {
    dishId: `dish-${id}`,
    globalDishId: `gld-${id}`,
    name: `Món ${id}`,
    systemTags: [],
    effectiveInteraction: interaction,
    daysSinceLastEaten: null,
    lane: 'EXPLOIT',
  }
}

describe('SPEC-036 / F51 — resumePosition', () => {
  it('chưa vuốt thẻ nào: cursor = 0, marks = []', () => {
    const dishes = Array.from({ length: 30 }, (_, i) => makeTestDish(String(i), null))
    const result = resumePosition(dishes)
    expect(result.cursor).toBe(0)
    expect(result.marks).toEqual([])
  })

  it('mảng rỗng: cursor = 0, marks = []', () => {
    const result = resumePosition([])
    expect(result.cursor).toBe(0)
    expect(result.marks).toEqual([])
  })

  it('TC-145: 30 thẻ, 12 thẻ đầu có effectiveInteraction -> cursor = 12, marks.length = 12', () => {
    const dishes = Array.from({ length: 30 }, (_, i) => {
      if (i < 12) {
        return makeTestDish(String(i), i % 2 === 0 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT')
      }
      return makeTestDish(String(i), null)
    })

    const result = resumePosition(dishes)
    expect(result.cursor).toBe(12)
    expect(result.marks).toHaveLength(12)
    expect(result.marks[0]).toBe('yes')
    expect(result.marks[1]).toBe('no')
  })

  it('TC-146: Thẻ #5 null (đã Undo), #1->#12 còn lại có tương tác -> cursor = 12, marks[4] === cannot', () => {
    // Chỉ số 0..11 tương ứng thẻ #1..#12
    // Thẻ #5 có index = 4, effectiveInteraction = null
    const dishes = Array.from({ length: 30 }, (_, i) => {
      if (i === 4) {
        return makeTestDish(String(i), null)
      }
      if (i < 12) {
        return makeTestDish(String(i), 'SWIPE_RIGHT')
      }
      return makeTestDish(String(i), null)
    })

    const result = resumePosition(dishes)
    expect(result.cursor).toBe(12)
    expect(result.marks).toHaveLength(12)
    expect(result.marks[4]).toBe('cannot')
    expect(result.marks[0]).toBe('yes')
    expect(result.marks[11]).toBe('yes')
  })

  it('vuốt hết 30 thẻ: cursor = 30, marks.length = 30', () => {
    const dishes = Array.from({ length: 30 }, (_, i) =>
      makeTestDish(String(i), i % 2 === 0 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT'),
    )

    const result = resumePosition(dishes)
    expect(result.cursor).toBe(30)
    expect(result.marks).toHaveLength(30)
  })

  it('SWIPE_RIGHT -> yes, SWIPE_LEFT -> no, UNDO/null trong tiền tố -> cannot', () => {
    const dishes = [
      makeTestDish('1', 'SWIPE_RIGHT'),
      makeTestDish('2', 'SWIPE_LEFT'),
      makeTestDish('3', null),
      makeTestDish('4', 'SWIPE_RIGHT'),
      makeTestDish('5', null),
    ]

    const result = resumePosition(dishes)
    expect(result.cursor).toBe(4)
    expect(result.marks).toEqual(['yes', 'no', 'cannot', 'yes'])
  })
})
