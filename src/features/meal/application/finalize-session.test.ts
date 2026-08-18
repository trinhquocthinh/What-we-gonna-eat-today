import { describe, expect, it } from 'vitest'

import type { MealRepository, SessionForMeal } from './meal-repository'
import { finalizeSession } from './finalize-session'

function makeFakeMealRepository(options: {
  session?: SessionForMeal | null
  draft?: { finalMealId: string; groupDishIds: string[] } | null
  inactiveDishIds?: string[]
  participantUserIds?: string[]
}) {
  const commitCalls: Array<{ sessionId: string; eatingHistoryRows: readonly unknown[] }> = []

  const repository: MealRepository = {
    async findSessionForMeal() {
      return (
        options.session ?? {
          id: 's1',
          creatorUserId: 'creator-1',
          state: 'ACTIVE',
          decisionDate: '2026-08-14',
        }
      )
    },
    async findInactiveDishIds() {
      return options.inactiveDishIds ?? []
    },
    async saveDraft(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async getDraft() {
      return options.draft === undefined
        ? { finalMealId: 'final-meal-1', groupDishIds: ['d1', 'd2'] }
        : options.draft
    },
    async listActiveParticipantUserIds() {
      return options.participantUserIds ?? ['u1', 'u2']
    },
    async resolveGlobalDishIds(groupDishIds) {
      return new Map(groupDishIds.map((id) => [id, `global-${id}`]))
    },
    async commitFinalize(input) {
      commitCalls.push(input)
    },
  }

  return { repository, commitCalls }
}

const INPUT = { sessionId: 's1', userId: 'creator-1' } as const

describe('SPEC-016 rút gọn — Finalize', () => {
  it('SPEC-016: nháp hợp lệ thì finalize thành công và gọi commitFinalize đúng một lần', async () => {
    const fake = makeFakeMealRepository({})

    const result = await finalizeSession({ meal: fake.repository }, INPUT)

    expect(result.ok).toBe(true)
    expect(fake.commitCalls).toHaveLength(1)
    // 2 dish × 2 participant = 4 dòng eating_history.
    expect(fake.commitCalls[0]?.eatingHistoryRows).toHaveLength(4)
  })

  it('TC-068: nháp rỗng thì ERR_EMPTY_FINAL_MEAL, không gọi commitFinalize', async () => {
    const fake = makeFakeMealRepository({ draft: null })

    const result = await finalizeSession({ meal: fake.repository }, INPUT)

    expect(result.ok === false && result.error.code).toBe('ERR_EMPTY_FINAL_MEAL')
    expect(fake.commitCalls).toHaveLength(0)
  })

  it('TC-070: Session đã FINALIZED thì ERR_SESSION_NOT_ACTIVE', async () => {
    const fake = makeFakeMealRepository({
      session: {
        id: 's1',
        creatorUserId: 'creator-1',
        state: 'FINALIZED',
        decisionDate: '2026-08-14',
      },
    })

    const result = await finalizeSession({ meal: fake.repository }, INPUT)

    expect(result.ok === false && result.error.code).toBe('ERR_SESSION_NOT_ACTIVE')
    expect(fake.commitCalls).toHaveLength(0)
  })

  it('SPEC-016: người gọi không phải Creator thì ERR_NOT_SESSION_CREATOR', async () => {
    const fake = makeFakeMealRepository({
      session: {
        id: 's1',
        creatorUserId: 'someone-else',
        state: 'ACTIVE',
        decisionDate: '2026-08-14',
      },
    })

    const result = await finalizeSession({ meal: fake.repository }, INPUT)

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_SESSION_CREATOR')
  })

  it('SPEC-016 bước 4: Dish bị gỡ khỏi pool sau khi lưu nháp thì ERR_DISH_NOT_IN_POOL, không gọi commitFinalize', async () => {
    const fake = makeFakeMealRepository({ inactiveDishIds: ['d1'] })

    const result = await finalizeSession({ meal: fake.repository }, INPUT)

    expect(result.ok === false && result.error.code).toBe('ERR_DISH_NOT_IN_POOL')
    expect(fake.commitCalls).toHaveLength(0)
  })
})
