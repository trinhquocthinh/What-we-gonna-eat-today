import { describe, expect, it, vi } from 'vitest'

import type { FinalMealView, MealRepository } from './meal-repository'
import { viewFinalMeal } from './view-final-meal'

describe('viewFinalMeal (SPEC-016)', () => {
  it('chuyển tiếp đúng sessionId tới repository và trả về mâm cơm đã chốt', async () => {
    const fakeMeal: FinalMealView = {
      decisionDate: '2026-08-20',
      finalizedAt: new Date('2026-08-20T18:00:00Z'),
      finalizedByDisplayName: 'Mẹ',
      dishes: [
        {
          groupDishId: 'gd-1',
          name: 'Canh chua cá lóc',
          systemTags: ['SOUP'],
        },
      ],
      participantNames: ['Mẹ', 'Bố'],
    }

    const findFinalMealMock = vi.fn(async (_sessionId: string) => fakeMeal)
    const repository = {
      findFinalMeal: findFinalMealMock,
    } as unknown as MealRepository

    const result = await viewFinalMeal({ meal: repository }, 's1')

    expect(result).toBe(fakeMeal)
    expect(findFinalMealMock).toHaveBeenCalledWith('s1')
  })

  it('trả về null khi session chưa chốt hoặc không tồn tại', async () => {
    const findFinalMealMock = vi.fn(async (_sessionId: string) => null)
    const repository = {
      findFinalMeal: findFinalMealMock,
    } as unknown as MealRepository

    const result = await viewFinalMeal({ meal: repository }, 's-nonexistent')

    expect(result).toBeNull()
    expect(findFinalMealMock).toHaveBeenCalledWith('s-nonexistent')
  })
})
