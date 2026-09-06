import { describe, expect, it } from 'vitest'

import type { MealRepository, SessionForMeal } from './meal-repository'
import { saveFinalMealDraft } from './save-final-meal-draft'

function makeFakeMealRepository(options: {
  session?: SessionForMeal | null
  inactiveDishIds?: string[]
}) {
  const savedDrafts: Array<{ sessionId: string; groupDishIds: readonly string[] }> = []

  const repository: MealRepository = {
    async findSessionForMeal() {
      return (
        options.session ?? {
          id: 's1',
          creatorUserId: 'creator-1',
          state: 'ACTIVE',
          decisionDate: '2026-08-14',
          groupTimeZone: 'Asia/Ho_Chi_Minh',
        }
      )
    },
    async findInactiveDishIds() {
      return options.inactiveDishIds ?? []
    },
    async saveDraft(sessionId, groupDishIds) {
      savedDrafts.push({ sessionId, groupDishIds })
      return { finalMealId: 'final-meal-1' }
    },
    async findSystemTagsByGroupDish(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async getDraft(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async listActiveParticipantUserIds(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async resolveGlobalDishIds(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async commitFinalize(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async findFinalMeal(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
  }

  return { repository, savedDrafts }
}

const INPUT = { sessionId: 's1', userId: 'creator-1' } as const

describe('SPEC-015 — Dựng Final Meal nháp (application)', () => {
  it('TC-063: Creator chọn 3 Dish hợp lệ thì nháp chứa đúng 3 Dish', async () => {
    const fake = makeFakeMealRepository({})

    const result = await saveFinalMealDraft(
      { meal: fake.repository },
      { ...INPUT, dishIds: ['d1', 'd2', 'd3'] },
    )

    expect(result.ok).toBe(true)
    expect(fake.savedDrafts).toHaveLength(1)
    expect(fake.savedDrafts[0]?.groupDishIds).toEqual(['d1', 'd2', 'd3'])
  })

  it('TC-064: danh sách trùng dishId thì ERR_DUPLICATE_DISH_IN_MEAL, KHÔNG ghi', async () => {
    const fake = makeFakeMealRepository({})

    const result = await saveFinalMealDraft(
      { meal: fake.repository },
      { ...INPUT, dishIds: ['d1', 'd1'] },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_DUPLICATE_DISH_IN_MEAL')
    expect(fake.savedDrafts).toHaveLength(0)
  })

  it('TC-066: Dish không ai swipe vẫn lưu được — draft không đọc interactions', async () => {
    const fake = makeFakeMealRepository({})

    const result = await saveFinalMealDraft(
      { meal: fake.repository },
      { ...INPUT, dishIds: ['d-never-swiped'] },
    )

    expect(result.ok).toBe(true)
  })

  it('SPEC-015: người gọi không phải Creator thì ERR_NOT_SESSION_CREATOR', async () => {
    const fake = makeFakeMealRepository({
      session: {
        id: 's1',
        creatorUserId: 'someone-else',
        state: 'ACTIVE',
        decisionDate: '2026-08-14',
        groupTimeZone: 'Asia/Ho_Chi_Minh',
      },
    })

    const result = await saveFinalMealDraft(
      { meal: fake.repository },
      { ...INPUT, dishIds: ['d1'] },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_SESSION_CREATOR')
  })

  it('SPEC-015: Session không ACTIVE thì ERR_SESSION_NOT_ACTIVE', async () => {
    const fake = makeFakeMealRepository({
      session: {
        id: 's1',
        creatorUserId: 'creator-1',
        state: 'DRAFT',
        decisionDate: '2026-08-14',
        groupTimeZone: 'Asia/Ho_Chi_Minh',
      },
    })

    const result = await saveFinalMealDraft(
      { meal: fake.repository },
      { ...INPUT, dishIds: ['d1'] },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_SESSION_NOT_ACTIVE')
  })

  it('SPEC-015: Dish không active trong pool thì ERR_DISH_NOT_IN_POOL', async () => {
    const fake = makeFakeMealRepository({ inactiveDishIds: ['d-inactive'] })

    const result = await saveFinalMealDraft(
      { meal: fake.repository },
      { ...INPUT, dishIds: ['d-inactive'] },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_DISH_NOT_IN_POOL')
    expect(fake.savedDrafts).toHaveLength(0)
  })
})
