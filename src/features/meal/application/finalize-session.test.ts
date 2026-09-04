import { describe, expect, it } from 'vitest'

import type { PreferenceRepository } from '@/features/preference/application/preference-repository'
import type { RuleRepository } from '@/features/rule/application/rule-repository'
import type { SessionRule } from '@/features/rule/domain/evaluate'
import type { SystemTag } from '@/shared/domain/system-tag'

import type { MealRepository, SessionForMeal } from './meal-repository'
import { finalizeSession } from './finalize-session'

function makeFakeMealRepository(options: {
  session?: SessionForMeal | null
  draft?: { finalMealId: string; groupDishIds: string[] } | null
  inactiveDishIds?: string[]
  participantUserIds?: string[]
  tagsByDish?: Map<string, SystemTag[]>
  findTagsCalls?: string[][]
}) {
  const commitCalls: Array<Parameters<MealRepository['commitFinalize']>[0]> = []

  const repository: MealRepository = {
    async findSessionForMeal() {
      return (
        options.session ?? {
          id: 's1',
          creatorUserId: 'creator-1',
          state: 'ACTIVE',
          decisionDate: '2099-08-14',
          groupTimeZone: 'Asia/Ho_Chi_Minh',
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
    async findSystemTagsByGroupDish(groupDishIds) {
      options.findTagsCalls?.push([...groupDishIds])
      return options.tagsByDish ?? new Map(groupDishIds.map((id) => [id, ['MAIN'] as SystemTag[]]))
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
    async findFinalMeal(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
  }

  return { repository, commitCalls }
}

function makeFakeRuleRepository(
  options: {
    rules?: SessionRule[]
    listSessionRulesCalls?: string[]
  } = {},
) {
  const repository: RuleRepository = {
    async listGroupRules(): Promise<never> {
      throw new Error('không dùng trong finalize')
    },
    async replaceGroupRules(): Promise<never> {
      throw new Error('không dùng trong finalize')
    },
    async listSessionRules(sessionId: string) {
      options.listSessionRulesCalls?.push(sessionId)
      return options.rules ?? []
    },
  }

  return repository
}

function makeFakePreferenceRepository(
  options: {
    constraintsByUser?: Map<string, ReadonlySet<string>>
  } = {},
) {
  const repository: PreferenceRepository = {
    async setConstraint(): Promise<never> {
      throw new Error('không dùng trong finalize')
    },
    async setPreference(): Promise<never> {
      throw new Error('không dùng trong finalize')
    },
    async findConstrainedGlobalDishIds(userId: string) {
      return options.constraintsByUser?.get(userId) ?? new Set()
    },
    async findCannotEatPairs(userIds: readonly string[], globalDishIds: readonly string[]) {
      const pairs = new Set<string>()
      for (const userId of userIds) {
        for (const globalDishId of options.constraintsByUser?.get(userId) ?? []) {
          if (globalDishIds.includes(globalDishId)) {
            pairs.add(`${userId}:${globalDishId}`)
          }
        }
      }
      return pairs
    },
    async findPreferencesByGlobalDish(): Promise<never> {
      throw new Error('không dùng trong finalize')
    },
  }

  return repository
}

const INPUT = { sessionId: 's1', userId: 'creator-1' } as const

describe('SPEC-016 — Finalize', () => {
  it('SPEC-016: nháp hợp lệ thì finalize thành công và gọi commitFinalize đúng một lần', async () => {
    const fakeMeal = makeFakeMealRepository({})
    const fakeRules = makeFakeRuleRepository()
    const fakePreferences = makeFakePreferenceRepository()

    const result = await finalizeSession(
      { meal: fakeMeal.repository, rules: fakeRules, preferences: fakePreferences },
      INPUT,
    )

    expect(result.ok).toBe(true)
    expect(fakeMeal.commitCalls).toHaveLength(1)
    // 2 dish × 2 participant = 4 dòng eating_history.
    expect(fakeMeal.commitCalls[0]?.eatingHistoryRows).toHaveLength(4)
  })

  it('TC-068: nháp rỗng thì ERR_EMPTY_FINAL_MEAL, không gọi commitFinalize', async () => {
    const fakeMeal = makeFakeMealRepository({ draft: null })
    const fakeRules = makeFakeRuleRepository()
    const fakePreferences = makeFakePreferenceRepository()

    const result = await finalizeSession(
      { meal: fakeMeal.repository, rules: fakeRules, preferences: fakePreferences },
      INPUT,
    )

    expect(result.ok === false && result.error.code).toBe('ERR_EMPTY_FINAL_MEAL')
    expect(fakeMeal.commitCalls).toHaveLength(0)
  })

  it('TC-070: Session đã FINALIZED thì ERR_SESSION_NOT_ACTIVE', async () => {
    const fakeMeal = makeFakeMealRepository({
      session: {
        id: 's1',
        creatorUserId: 'creator-1',
        state: 'FINALIZED',
        decisionDate: '2099-08-14',
        groupTimeZone: 'Asia/Ho_Chi_Minh',
      },
    })
    const fakeRules = makeFakeRuleRepository()
    const fakePreferences = makeFakePreferenceRepository()

    const result = await finalizeSession(
      { meal: fakeMeal.repository, rules: fakeRules, preferences: fakePreferences },
      INPUT,
    )

    expect(result.ok === false && result.error.code).toBe('ERR_SESSION_NOT_ACTIVE')
    expect(fakeMeal.commitCalls).toHaveLength(0)
  })

  it('SPEC-016: người gọi không phải Creator thì ERR_NOT_SESSION_CREATOR', async () => {
    const fakeMeal = makeFakeMealRepository({
      session: {
        id: 's1',
        creatorUserId: 'someone-else',
        state: 'ACTIVE',
        decisionDate: '2099-08-14',
        groupTimeZone: 'Asia/Ho_Chi_Minh',
      },
    })
    const fakeRules = makeFakeRuleRepository()
    const fakePreferences = makeFakePreferenceRepository()

    const result = await finalizeSession(
      { meal: fakeMeal.repository, rules: fakeRules, preferences: fakePreferences },
      INPUT,
    )

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_SESSION_CREATOR')
  })

  it('SPEC-016 bước 4: Dish bị gỡ khỏi pool sau khi lưu nháp thì ERR_DISH_NOT_IN_POOL, không gọi commitFinalize', async () => {
    const fakeMeal = makeFakeMealRepository({ inactiveDishIds: ['d1'] })
    const fakeRules = makeFakeRuleRepository()
    const fakePreferences = makeFakePreferenceRepository()

    const result = await finalizeSession(
      { meal: fakeMeal.repository, rules: fakeRules, preferences: fakePreferences },
      INPUT,
    )

    expect(result.ok === false && result.error.code).toBe('ERR_DISH_NOT_IN_POOL')
    expect(fakeMeal.commitCalls).toHaveLength(0)
  })

  // TC-110: Rule rỗng
  it('TC-110: Rule rỗng, nháp 1 món → chốt thành công', async () => {
    const fakeMeal = makeFakeMealRepository({
      draft: { finalMealId: 'final-meal-1', groupDishIds: ['d1'] },
      tagsByDish: new Map([['d1', ['MAIN']]]),
    })
    const fakeRules = makeFakeRuleRepository({ rules: [] })
    const fakePreferences = makeFakePreferenceRepository()

    const result = await finalizeSession(
      { meal: fakeMeal.repository, rules: fakeRules, preferences: fakePreferences },
      INPUT,
    )

    expect(result.ok).toBe(true)
    expect(fakeMeal.commitCalls).toHaveLength(1)
  })

  // TC-072: Thiếu canh
  it('TC-072: Rule SOUP>=1, nháp toàn MAIN → ERR_REQUIRED_RULE_FAILED, commitFinalize không được gọi', async () => {
    const fakeMeal = makeFakeMealRepository({
      draft: { finalMealId: 'final-meal-1', groupDishIds: ['d1', 'd2'] },
      tagsByDish: new Map([
        ['d1', ['MAIN']],
        ['d2', ['MAIN']],
      ]),
    })
    const fakeRules = makeFakeRuleRepository({
      rules: [{ systemTag: 'SOUP', minimumCount: 1, ruleType: 'REQUIRED' }],
    })
    const fakePreferences = makeFakePreferenceRepository()

    const result = await finalizeSession(
      { meal: fakeMeal.repository, rules: fakeRules, preferences: fakePreferences },
      INPUT,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('ERR_REQUIRED_RULE_FAILED')
      expect(result.error.details?.shortfalls).toEqual([
        { ruleType: 'REQUIRED', systemTag: 'SOUP', minimumCount: 1, actual: 0, missing: 1 },
      ])
    }
    expect(fakeMeal.commitCalls).toHaveLength(0)
  })

  // TC-073: Món hai tag
  it('TC-073: Rule MAIN>=1 + SOUP>=1, một món [MAIN, SOUP] → thành công', async () => {
    const fakeMeal = makeFakeMealRepository({
      draft: { finalMealId: 'final-meal-1', groupDishIds: ['d1'] },
      tagsByDish: new Map([['d1', ['MAIN', 'SOUP']]]),
    })
    const fakeRules = makeFakeRuleRepository({
      rules: [
        { systemTag: 'MAIN', minimumCount: 1, ruleType: 'REQUIRED' },
        { systemTag: 'SOUP', minimumCount: 1, ruleType: 'REQUIRED' },
      ],
    })
    const fakePreferences = makeFakePreferenceRepository()

    const result = await finalizeSession(
      { meal: fakeMeal.repository, rules: fakeRules, preferences: fakePreferences },
      INPUT,
    )

    expect(result.ok).toBe(true)
    expect(fakeMeal.commitCalls).toHaveLength(1)
  })

  // TC-074: Rule đọc từ snapshot
  it('TC-074: listSessionRules được gọi với đúng sessionId', async () => {
    const listSessionRulesCalls: string[] = []
    const fakeMeal = makeFakeMealRepository({
      draft: { finalMealId: 'final-meal-1', groupDishIds: ['d1'] },
      tagsByDish: new Map([['d1', ['MAIN']]]),
    })
    const fakeRules = makeFakeRuleRepository({
      rules: [{ systemTag: 'MAIN', minimumCount: 1, ruleType: 'REQUIRED' }],
      listSessionRulesCalls,
    })
    const fakePreferences = makeFakePreferenceRepository()

    const result = await finalizeSession(
      { meal: fakeMeal.repository, rules: fakeRules, preferences: fakePreferences },
      INPUT,
    )

    expect(result.ok).toBe(true)
    expect(listSessionRulesCalls).toEqual(['s1'])
  })

  // TC-075: Tag đọc lúc chốt
  it('TC-075: findSystemTagsByGroupDish được gọi và kết quả quyết định tính hợp lệ', async () => {
    const findTagsCalls: string[][] = []
    const fakeMeal = makeFakeMealRepository({
      draft: { finalMealId: 'final-meal-1', groupDishIds: ['d1'] },
      tagsByDish: new Map([['d1', ['SOUP']]]),
      findTagsCalls,
    })
    const fakeRules = makeFakeRuleRepository({
      rules: [{ systemTag: 'SOUP', minimumCount: 1, ruleType: 'REQUIRED' }],
    })
    const fakePreferences = makeFakePreferenceRepository()

    const result = await finalizeSession(
      { meal: fakeMeal.repository, rules: fakeRules, preferences: fakePreferences },
      INPUT,
    )

    expect(result.ok).toBe(true)
    expect(findTagsCalls).toEqual([['d1']])
  })

  it('BR-056: Participant khai Cannot Eat món nào thì không sinh lịch sử ăn cho món đó', async () => {
    const fakeMeal = makeFakeMealRepository({
      participantUserIds: ['u1', 'u2'],
      draft: { finalMealId: 'final-meal-1', groupDishIds: ['d1', 'd2'] },
    })
    const fakeRules = makeFakeRuleRepository()
    const fakePreferences = makeFakePreferenceRepository({
      constraintsByUser: new Map([['u2', new Set(['global-d1'])]]),
    })

    const result = await finalizeSession(
      { meal: fakeMeal.repository, rules: fakeRules, preferences: fakePreferences },
      INPUT,
    )

    expect(result.ok).toBe(true)
    expect(fakeMeal.commitCalls).toHaveLength(1)
    // (u1, d1), (u1, d2), (u2, d2) -> 3 rows, (u2, d1) bị bỏ qua
    const rows = fakeMeal.commitCalls[0]?.eatingHistoryRows as ReadonlyArray<{
      userId: string
      globalDishId: string
    }>
    expect(rows).toHaveLength(3)
    expect(rows).toContainEqual(
      expect.objectContaining({ userId: 'u1', globalDishId: 'global-d1' }),
    )
    expect(rows).toContainEqual(
      expect.objectContaining({ userId: 'u1', globalDishId: 'global-d2' }),
    )
    expect(rows).toContainEqual(
      expect.objectContaining({ userId: 'u2', globalDishId: 'global-d2' }),
    )
    expect(rows).not.toContainEqual(
      expect.objectContaining({ userId: 'u2', globalDishId: 'global-d1' }),
    )
  })

  it('E10-T4 / TC-140: Chốt bữa sạch -> commitFinalize nhận warningRows rỗng', async () => {
    const fakeMeal = makeFakeMealRepository({
      session: {
        id: 's1',
        creatorUserId: 'creator-1',
        state: 'ACTIVE',
        decisionDate: '2099-08-14',
        groupTimeZone: 'Asia/Ho_Chi_Minh',
        targetDishCount: 2,
      },
      draft: { finalMealId: 'final-meal-1', groupDishIds: ['d1', 'd2'] },
      tagsByDish: new Map([
        ['d1', ['MAIN']],
        ['d2', ['SOUP']],
      ]),
    })
    const fakeRules = makeFakeRuleRepository({
      rules: [
        { systemTag: 'MAIN', minimumCount: 1, ruleType: 'REQUIRED' },
        { systemTag: 'SOUP', minimumCount: 1, ruleType: 'PREFERRED' },
      ],
    })
    const fakePreferences = makeFakePreferenceRepository()

    const result = await finalizeSession(
      { meal: fakeMeal.repository, rules: fakeRules, preferences: fakePreferences },
      INPUT,
    )

    expect(result.ok).toBe(true)
    expect(fakeMeal.commitCalls).toHaveLength(1)
    expect(fakeMeal.commitCalls[0]?.warningRows).toEqual([])
  })

  it('E10-T4: Chốt bữa có cảnh báo Preferred và Target Count -> commitFinalize nhận đúng warningRows', async () => {
    const fakeMeal = makeFakeMealRepository({
      session: {
        id: 's1',
        creatorUserId: 'creator-1',
        state: 'ACTIVE',
        decisionDate: '2099-08-14',
        groupTimeZone: 'Asia/Ho_Chi_Minh',
        targetDishCount: 4, // chọn 2 món nhưng target là 4 -> TARGET_COUNT warning
      },
      draft: { finalMealId: 'final-meal-1', groupDishIds: ['d1', 'd2'] },
      tagsByDish: new Map([
        ['d1', ['MAIN']],
        ['d2', ['MAIN']], // cả 2 món đều MAIN, thiếu SOUP preferred
      ]),
    })
    const fakeRules = makeFakeRuleRepository({
      rules: [
        { systemTag: 'MAIN', minimumCount: 1, ruleType: 'REQUIRED' },
        { systemTag: 'SOUP', minimumCount: 1, ruleType: 'PREFERRED' },
      ],
    })
    const fakePreferences = makeFakePreferenceRepository()

    const result = await finalizeSession(
      { meal: fakeMeal.repository, rules: fakeRules, preferences: fakePreferences },
      INPUT,
    )

    expect(result.ok).toBe(true)
    expect(fakeMeal.commitCalls).toHaveLength(1)
    expect(fakeMeal.commitCalls[0]?.warningRows).toEqual([
      {
        kind: 'PREFERRED_SHORTFALL',
        systemTag: 'SOUP',
        expected: 1,
        actual: 0,
      },
      {
        kind: 'TARGET_COUNT',
        systemTag: null,
        expected: 4,
        actual: 2,
      },
    ])
  })

  it('E10-T4: Chốt bữa có blocking rule -> trả lỗi ERR_REQUIRED_RULE_FAILED, commitFinalize không được gọi', async () => {
    const fakeMeal = makeFakeMealRepository({
      session: {
        id: 's1',
        creatorUserId: 'creator-1',
        state: 'ACTIVE',
        decisionDate: '2099-08-14',
        groupTimeZone: 'Asia/Ho_Chi_Minh',
        targetDishCount: 2,
      },
      draft: { finalMealId: 'final-meal-1', groupDishIds: ['d1', 'd2'] },
      tagsByDish: new Map([
        ['d1', ['SIDE']],
        ['d2', ['SIDE']],
      ]),
    })
    const fakeRules = makeFakeRuleRepository({
      rules: [
        { systemTag: 'MAIN', minimumCount: 1, ruleType: 'REQUIRED' }, // Thiếu MAIN -> blocking
      ],
    })
    const fakePreferences = makeFakePreferenceRepository()

    const result = await finalizeSession(
      { meal: fakeMeal.repository, rules: fakeRules, preferences: fakePreferences },
      INPUT,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('ERR_REQUIRED_RULE_FAILED')
    }
    expect(fakeMeal.commitCalls).toHaveLength(0)
  })

  it('TC-156: Session ACTIVE của ngày cũ -> ERR_SESSION_NOT_ACTIVE, commitFinalize không được gọi', async () => {
    const fakeMeal = makeFakeMealRepository({
      session: {
        id: 's1',
        creatorUserId: 'creator-1',
        state: 'ACTIVE',
        decisionDate: '2020-01-01',
        groupTimeZone: 'Asia/Ho_Chi_Minh',
      },
    })
    const fakeRules = makeFakeRuleRepository()
    const fakePreferences = makeFakePreferenceRepository()

    const result = await finalizeSession(
      { meal: fakeMeal.repository, rules: fakeRules, preferences: fakePreferences },
      INPUT,
    )

    expect(result.ok === false && result.error.code).toBe('ERR_SESSION_NOT_ACTIVE')
    expect(fakeMeal.commitCalls).toHaveLength(0)
  })
})
