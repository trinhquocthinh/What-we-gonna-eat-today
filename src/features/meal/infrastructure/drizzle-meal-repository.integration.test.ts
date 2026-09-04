import { eq, inArray } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { drizzlePreferenceRepository } from '@/features/preference/infrastructure/drizzle-preference-repository'
import { drizzleRuleRepository } from '@/features/rule/infrastructure/drizzle-rule-repository'
import { getDb } from '@/shared/db/client'
import {
  eatingHistory,
  finalizeWarnings,
  finalMealItems,
  finalMeals,
  globalDishes,
  groupDishes,
  groupDishTags,
  groupMembers,
  groupRules,
  groups,
  participants,
  selectionSessions,
  sessionCourses,
  sessionRules,
  userDishConstraints,
  users,
} from '@/shared/db/schema'

import { finalizeSession } from '../application/finalize-session'
import { saveFinalMealDraft } from '../application/save-final-meal-draft'
import { drizzleMealRepository } from './drizzle-meal-repository'

/** Seed: 1 Group, 2 User (Creator + 1 Participant khác), 1 Session ACTIVE, 2 Dish Active. */
async function seedActiveSessionWithTwoDishes() {
  const db = getDb()
  const creatorId = crypto.randomUUID()
  const otherUserId = crypto.randomUUID()
  const groupId = crypto.randomUUID()
  const sessionId = crypto.randomUUID()
  const dish1 = { globalId: crypto.randomUUID(), groupDishId: crypto.randomUUID() }
  const dish2 = { globalId: crypto.randomUUID(), groupDishId: crypto.randomUUID() }

  await db.insert(users).values([
    {
      id: creatorId,
      provider: 'test',
      providerSubject: `c-${creatorId}`,
      email: `${creatorId}@test`,
      displayName: 'Creator',
    },
    {
      id: otherUserId,
      provider: 'test',
      providerSubject: `o-${otherUserId}`,
      email: `${otherUserId}@test`,
      displayName: 'Other',
    },
  ])
  await db.insert(groups).values({ id: groupId, name: 'Integration Group', timezone: 'UTC' })
  await db.insert(groupMembers).values([
    { groupId, userId: creatorId, isAdmin: true },
    { groupId, userId: otherUserId, isAdmin: false },
  ])
  await db.insert(selectionSessions).values({
    id: sessionId,
    groupId,
    decisionDate: '2026-08-14',
    creatorUserId: creatorId,
    state: 'ACTIVE',
  })
  await db.insert(participants).values([
    { sessionId, userId: creatorId, state: 'ACTIVE' },
    { sessionId, userId: otherUserId, state: 'ACTIVE' },
  ])
  await db.insert(globalDishes).values([
    {
      id: dish1.globalId,
      name: 'Món 1',
      normalizedName: 'món 1',
      createdByUserId: creatorId,
      createdFromGroupId: groupId,
    },
    {
      id: dish2.globalId,
      name: 'Món 2',
      normalizedName: 'món 2',
      createdByUserId: creatorId,
      createdFromGroupId: groupId,
    },
  ])
  await db.insert(groupDishes).values([
    { id: dish1.groupDishId, groupId, globalDishId: dish1.globalId, state: 'ACTIVE' },
    { id: dish2.groupDishId, groupId, globalDishId: dish2.globalId, state: 'ACTIVE' },
  ])

  return { creatorId, otherUserId, groupId, sessionId, dish1, dish2 }
}

type Seed = Awaited<ReturnType<typeof seedActiveSessionWithTwoDishes>>

async function cleanup(seed: Seed) {
  const db = getDb()
  await db
    .delete(sessionRules)
    .where(eq(sessionRules.sessionId, seed.sessionId))
    .catch(() => {})
  await db
    .delete(sessionCourses)
    .where(eq(sessionCourses.sessionId, seed.sessionId))
    .catch(() => {})
  await db
    .delete(groupRules)
    .where(eq(groupRules.groupId, seed.groupId))
    .catch(() => {})
  await db
    .delete(groupDishTags)
    .where(inArray(groupDishTags.groupDishId, [seed.dish1.groupDishId, seed.dish2.groupDishId]))
    .catch(() => {})
  await db
    .delete(eatingHistory)
    .where(eq(eatingHistory.sourceFinalMealId, seed.sessionId))
    .catch(() => {})
  const meal = await db
    .select({ id: finalMeals.id })
    .from(finalMeals)
    .where(eq(finalMeals.sessionId, seed.sessionId))
  for (const row of meal) {
    await db.delete(eatingHistory).where(eq(eatingHistory.sourceFinalMealId, row.id))
    await db.delete(finalMealItems).where(eq(finalMealItems.finalMealId, row.id))
  }
  await db.delete(finalMeals).where(eq(finalMeals.sessionId, seed.sessionId))
  await db
    .delete(finalizeWarnings)
    .where(eq(finalizeWarnings.sessionId, seed.sessionId))
    .catch(() => {})
  await db.delete(participants).where(eq(participants.sessionId, seed.sessionId))
  await db.delete(selectionSessions).where(eq(selectionSessions.id, seed.sessionId))
  await db
    .delete(userDishConstraints)
    .where(inArray(userDishConstraints.userId, [seed.creatorId, seed.otherUserId]))
    .catch(() => {})
  await db.delete(groupDishes).where(eq(groupDishes.groupId, seed.groupId))
  await db.delete(globalDishes).where(eq(globalDishes.createdFromGroupId, seed.groupId))
  await db.delete(groupMembers).where(eq(groupMembers.groupId, seed.groupId))
  await db.delete(groups).where(eq(groups.id, seed.groupId))
  await db.delete(users).where(eq(users.id, seed.creatorId))
  await db.delete(users).where(eq(users.id, seed.otherUserId))
}

const cleanupQueue: Array<() => Promise<void>> = []

afterEach(async () => {
  while (cleanupQueue.length > 0) {
    const fn = cleanupQueue.pop()
    if (fn !== undefined) await fn()
  }
})

describe('SPEC-015/016 — draft và finalize (integration)', () => {
  it('TC-065: Dish vừa bị gỡ khỏi pool thì lưu nháp có Dish đó bị ERR_DISH_NOT_IN_POOL', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))
    await getDb()
      .update(groupDishes)
      .set({ state: 'INACTIVE' })
      .where(eq(groupDishes.id, seed.dish1.groupDishId))

    const result = await saveFinalMealDraft(
      { meal: drizzleMealRepository },
      { sessionId: seed.sessionId, userId: seed.creatorId, dishIds: [seed.dish1.groupDishId] },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_DISH_NOT_IN_POOL')
  })

  it('TC-067 + TC-071: nháp hợp lệ, Finalize thành công thì Session FINALIZED và Eating History tồn tại', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))

    const draft = await saveFinalMealDraft(
      { meal: drizzleMealRepository },
      {
        sessionId: seed.sessionId,
        userId: seed.creatorId,
        dishIds: [seed.dish1.groupDishId, seed.dish2.groupDishId],
      },
    )
    expect(draft.ok).toBe(true)

    const finalize = await finalizeSession(
      {
        meal: drizzleMealRepository,
        rules: drizzleRuleRepository,
        preferences: drizzlePreferenceRepository,
      },
      { sessionId: seed.sessionId, userId: seed.creatorId },
    )
    expect(finalize.ok).toBe(true)

    const session = await getDb()
      .select({ state: selectionSessions.state })
      .from(selectionSessions)
      .where(eq(selectionSessions.id, seed.sessionId))
    expect(session[0]?.state).toBe('FINALIZED')

    // 2 Dish × 2 Participant = 4 dòng.
    const historyRows = await getDb()
      .select()
      .from(eatingHistory)
      .where(eq(eatingHistory.sourceFinalMealId, finalize.ok ? finalize.value.finalMealId : ''))
    expect(historyRows).toHaveLength(4)
  })

  it('TC-122: Chốt bữa có món X; người B đã khai Cannot Eat món X -> KHÔNG sinh lịch sử ăn cho B; món Y vẫn sinh cho B', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))

    // Người B (otherUserId) khai Cannot Eat cho dish1
    await drizzlePreferenceRepository.setConstraint({
      userId: seed.otherUserId,
      globalDishId: seed.dish1.globalId,
      cannotEat: true,
    })

    const draft = await saveFinalMealDraft(
      { meal: drizzleMealRepository },
      {
        sessionId: seed.sessionId,
        userId: seed.creatorId,
        dishIds: [seed.dish1.groupDishId, seed.dish2.groupDishId],
      },
    )
    expect(draft.ok).toBe(true)

    const finalize = await finalizeSession(
      {
        meal: drizzleMealRepository,
        rules: drizzleRuleRepository,
        preferences: drizzlePreferenceRepository,
      },
      { sessionId: seed.sessionId, userId: seed.creatorId },
    )
    expect(finalize.ok).toBe(true)

    const finalMealId = finalize.ok ? finalize.value.finalMealId : ''
    const historyRows = await getDb()
      .select()
      .from(eatingHistory)
      .where(eq(eatingHistory.sourceFinalMealId, finalMealId))

    // (A, dish1), (A, dish2), (B, dish2) -> Đúng 3 dòng. KHÔNG có (B, dish1)
    expect(historyRows).toHaveLength(3)
    expect(historyRows).toContainEqual(
      expect.objectContaining({ userId: seed.creatorId, globalDishId: seed.dish1.globalId }),
    )
    expect(historyRows).toContainEqual(
      expect.objectContaining({ userId: seed.creatorId, globalDishId: seed.dish2.globalId }),
    )
    expect(historyRows).toContainEqual(
      expect.objectContaining({ userId: seed.otherUserId, globalDishId: seed.dish2.globalId }),
    )
    expect(historyRows).not.toContainEqual(
      expect.objectContaining({ userId: seed.otherUserId, globalDishId: seed.dish1.globalId }),
    )
  })

  it('TC-069: Dish bị gỡ SAU khi lưu nháp thì Finalize trả ERR_DISH_NOT_IN_POOL, Session vẫn ACTIVE', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))

    await saveFinalMealDraft(
      { meal: drizzleMealRepository },
      { sessionId: seed.sessionId, userId: seed.creatorId, dishIds: [seed.dish1.groupDishId] },
    )
    await getDb()
      .update(groupDishes)
      .set({ state: 'INACTIVE' })
      .where(eq(groupDishes.id, seed.dish1.groupDishId))

    const finalize = await finalizeSession(
      {
        meal: drizzleMealRepository,
        rules: drizzleRuleRepository,
        preferences: drizzlePreferenceRepository,
      },
      { sessionId: seed.sessionId, userId: seed.creatorId },
    )

    expect(finalize.ok === false && finalize.error.code).toBe('ERR_DISH_NOT_IN_POOL')
    const session = await getDb()
      .select({ state: selectionSessions.state })
      .from(selectionSessions)
      .where(eq(selectionSessions.id, seed.sessionId))
    expect(session[0]?.state).toBe('ACTIVE')
  })

  it('TC-077: commitFinalize gọi hai lần với cùng dữ liệu thì vẫn đúng số dòng, không nhân đôi', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))

    const draft = await saveFinalMealDraft(
      { meal: drizzleMealRepository },
      { sessionId: seed.sessionId, userId: seed.creatorId, dishIds: [seed.dish1.groupDishId] },
    )
    if (!draft.ok) throw new Error('setup thất bại')

    const rows = [
      {
        userId: seed.creatorId,
        globalDishId: seed.dish1.globalId,
        eatingDate: '2026-08-14',
        sourceFinalMealId: draft.value.finalMealId,
      },
      {
        userId: seed.otherUserId,
        globalDishId: seed.dish1.globalId,
        eatingDate: '2026-08-14',
        sourceFinalMealId: draft.value.finalMealId,
      },
    ]

    await drizzleMealRepository.commitFinalize({
      sessionId: seed.sessionId,
      eatingHistoryRows: rows,
      warningRows: [],
    })
    await drizzleMealRepository.commitFinalize({
      sessionId: seed.sessionId,
      eatingHistoryRows: rows,
      warningRows: [],
    })

    const historyRows = await getDb()
      .select()
      .from(eatingHistory)
      .where(eq(eatingHistory.sourceFinalMealId, draft.value.finalMealId))
    expect(historyRows).toHaveLength(2)
  })

  it('TC-074: Rule đọc từ snapshot lúc Start — đổi group_rules sau đó không ảnh hưởng Finalize', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    // Snapshot SOUP >= 1 vào session_rules
    await db.insert(sessionRules).values({
      sessionId: seed.sessionId,
      ruleType: 'REQUIRED',
      systemTag: 'SOUP',
      minimumCount: 1,
    })

    // Xoá hoặc sửa group_rules
    await db.delete(groupRules).where(eq(groupRules.groupId, seed.groupId))

    // Gắn tag MAIN cho dish1 (không có SOUP)
    await db.insert(groupDishTags).values({
      groupDishId: seed.dish1.groupDishId,
      systemTag: 'MAIN',
    })

    // Lưu nháp dish1
    await saveFinalMealDraft(
      { meal: drizzleMealRepository },
      { sessionId: seed.sessionId, userId: seed.creatorId, dishIds: [seed.dish1.groupDishId] },
    )

    // Finalize phải FAIL vì session_rules vẫn đòi SOUP >= 1 (dù group_rules đã xoá)
    const finalize = await finalizeSession(
      {
        meal: drizzleMealRepository,
        rules: drizzleRuleRepository,
        preferences: drizzlePreferenceRepository,
      },
      { sessionId: seed.sessionId, userId: seed.creatorId },
    )

    expect(finalize.ok).toBe(false)
    if (!finalize.ok) {
      expect(finalize.error.code).toBe('ERR_REQUIRED_RULE_FAILED')
    }
  })

  it('TC-075: System Tag đọc tại thời điểm chốt bữa — đổi tag sau khi lưu nháp làm thay đổi kết quả', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    // Snapshot SOUP >= 1 vào session_rules
    await db.insert(sessionRules).values({
      sessionId: seed.sessionId,
      ruleType: 'REQUIRED',
      systemTag: 'SOUP',
      minimumCount: 1,
    })

    // Gắn nhãn MAIN ban đầu cho dish1
    await db.insert(groupDishTags).values({
      groupDishId: seed.dish1.groupDishId,
      systemTag: 'MAIN',
    })

    // Lưu nháp dish1
    await saveFinalMealDraft(
      { meal: drizzleMealRepository },
      { sessionId: seed.sessionId, userId: seed.creatorId, dishIds: [seed.dish1.groupDishId] },
    )

    // Chốt lần 1: FAIL vì thiếu canh
    const finalize1 = await finalizeSession(
      {
        meal: drizzleMealRepository,
        rules: drizzleRuleRepository,
        preferences: drizzlePreferenceRepository,
      },
      { sessionId: seed.sessionId, userId: seed.creatorId },
    )
    expect(finalize1.ok).toBe(false)

    // Admin gắn thêm nhãn SOUP cho dish1
    await db.insert(groupDishTags).values({
      groupDishId: seed.dish1.groupDishId,
      systemTag: 'SOUP',
    })

    // Chốt lần 2: THÀNH CÔNG vì đọc System Tag hiện tại lúc chốt
    const finalize2 = await finalizeSession(
      {
        meal: drizzleMealRepository,
        rules: drizzleRuleRepository,
        preferences: drizzlePreferenceRepository,
      },
      { sessionId: seed.sessionId, userId: seed.creatorId },
    )
    expect(finalize2.ok).toBe(true)
  })
})

describe('TC-109 — rollback thật khi một dòng eating_history lỗi', () => {
  it('TC-109: INSERT eating_history vi phạm khoá ngoại thì Session KHÔNG chuyển FINALIZED', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))

    const NONEXISTENT_GLOBAL_DISH_ID = crypto.randomUUID() // không tồn tại trong global_dishes

    await expect(
      drizzleMealRepository.commitFinalize({
        sessionId: seed.sessionId,
        eatingHistoryRows: [
          {
            userId: seed.creatorId,
            globalDishId: NONEXISTENT_GLOBAL_DISH_ID, // vi phạm FK — KHÔNG bị onConflictDoNothing nuốt
            eatingDate: '2026-08-14',
            sourceFinalMealId: crypto.randomUUID(),
          },
        ],
        warningRows: [
          {
            kind: 'PREFERRED_SHORTFALL',
            systemTag: 'SOUP',
            expected: 1,
            actual: 0,
          },
        ],
      }),
    ).rejects.toThrow()

    // Bằng chứng rollback: session PHẢI vẫn ACTIVE — nếu db.batch() không
    // atomic thật, UPDATE (câu đầu trong batch) đã commit trước khi INSERT
    // (câu sau) thất bại, và assertion dưới đây sẽ ĐỎ.
    const session = await getDb()
      .select({ state: selectionSessions.state })
      .from(selectionSessions)
      .where(eq(selectionSessions.id, seed.sessionId))
    expect(session[0]?.state).toBe('ACTIVE')

    // Và KHÔNG dòng finalize_warnings nào sót lại trong database
    const warnings = await getDb()
      .select()
      .from(finalizeWarnings)
      .where(eq(finalizeWarnings.sessionId, seed.sessionId))
    expect(warnings).toHaveLength(0)
  })
})

describe('E10-T4 — Lưu vết cảnh báo bị bỏ qua (finalize_warnings)', () => {
  it('TC-140: Chốt bữa sạch (đủ mọi rule và Target Count) -> finalize_warnings không có dòng nào', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    // Cấu hình target_dish_count = 2 cho session
    await db
      .update(selectionSessions)
      .set({ targetDishCount: 2 })
      .where(eq(selectionSessions.id, seed.sessionId))

    // Snapshot rule SOUP >= 1 (REQUIRED)
    await db.insert(sessionRules).values({
      sessionId: seed.sessionId,
      ruleType: 'REQUIRED',
      systemTag: 'SOUP',
      minimumCount: 1,
    })

    // Dish1 mang SOUP, Dish2 mang MAIN -> Đủ SOUP, 2 món = 2
    await db.insert(groupDishTags).values([
      { groupDishId: seed.dish1.groupDishId, systemTag: 'SOUP' },
      { groupDishId: seed.dish2.groupDishId, systemTag: 'MAIN' },
    ])

    await saveFinalMealDraft(
      { meal: drizzleMealRepository },
      {
        sessionId: seed.sessionId,
        userId: seed.creatorId,
        dishIds: [seed.dish1.groupDishId, seed.dish2.groupDishId],
      },
    )

    const finalize = await finalizeSession(
      {
        meal: drizzleMealRepository,
        rules: drizzleRuleRepository,
        preferences: drizzlePreferenceRepository,
      },
      { sessionId: seed.sessionId, userId: seed.creatorId },
    )

    expect(finalize.ok).toBe(true)

    const warnings = await db
      .select()
      .from(finalizeWarnings)
      .where(eq(finalizeWarnings.sessionId, seed.sessionId))
    expect(warnings).toHaveLength(0)
  })

  it('Chốt bữa thiếu 1 Preferred + lệch Target Count -> finalize_warnings ghi đúng 2 dòng, systemTag null ở TARGET_COUNT', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    // Cấu hình target_dish_count = 4 cho session (nhưng chỉ chọn 2 món -> lệch)
    await db
      .update(selectionSessions)
      .set({ targetDishCount: 4 })
      .where(eq(selectionSessions.id, seed.sessionId))

    // Snapshot: REQUIRED MAIN >= 1, PREFERRED SOUP >= 1
    await db.insert(sessionRules).values([
      {
        sessionId: seed.sessionId,
        ruleType: 'REQUIRED',
        systemTag: 'MAIN',
        minimumCount: 1,
      },
      {
        sessionId: seed.sessionId,
        ruleType: 'PREFERRED',
        systemTag: 'SOUP',
        minimumCount: 1,
      },
    ])

    // Cả 2 món đều là MAIN (thỏa REQUIRED MAIN, thiếu PREFERRED SOUP)
    await db.insert(groupDishTags).values([
      { groupDishId: seed.dish1.groupDishId, systemTag: 'MAIN' },
      { groupDishId: seed.dish2.groupDishId, systemTag: 'MAIN' },
    ])

    await saveFinalMealDraft(
      { meal: drizzleMealRepository },
      {
        sessionId: seed.sessionId,
        userId: seed.creatorId,
        dishIds: [seed.dish1.groupDishId, seed.dish2.groupDishId],
      },
    )

    const finalize = await finalizeSession(
      {
        meal: drizzleMealRepository,
        rules: drizzleRuleRepository,
        preferences: drizzlePreferenceRepository,
      },
      { sessionId: seed.sessionId, userId: seed.creatorId },
    )

    expect(finalize.ok).toBe(true)

    const warnings = await db
      .select()
      .from(finalizeWarnings)
      .where(eq(finalizeWarnings.sessionId, seed.sessionId))

    expect(warnings).toHaveLength(2)

    const prefWarning = warnings.find((w) => w.kind === 'PREFERRED_SHORTFALL')
    expect(prefWarning).toBeDefined()
    expect(prefWarning?.systemTag).toBe('SOUP')
    expect(prefWarning?.expected).toBe(1)
    expect(prefWarning?.actual).toBe(0)

    const targetWarning = warnings.find((w) => w.kind === 'TARGET_COUNT')
    expect(targetWarning).toBeDefined()
    expect(targetWarning?.systemTag).toBeNull()
    expect(targetWarning?.expected).toBe(4)
    expect(targetWarning?.actual).toBe(2)
  })
})

describe('findFinalMeal — E6-T7 (S-11)', () => {
  it('trả về chi tiết mâm cơm khi Session đã FINALIZED, bao gồm tags và người tham gia (loại bỏ REMOVED)', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    // Gắn tag cho dish1: MAIN + SOUP
    await db.insert(groupDishTags).values([
      { groupDishId: seed.dish1.groupDishId, systemTag: 'SOUP' },
      { groupDishId: seed.dish1.groupDishId, systemTag: 'MAIN' },
    ])

    // Thêm participant REMOVED
    const removedUserId = crypto.randomUUID()
    await db.insert(users).values({
      id: removedUserId,
      provider: 'test',
      providerSubject: `r-${removedUserId}`,
      email: `${removedUserId}@test`,
      displayName: 'Removed User',
    })
    await db.insert(participants).values({
      sessionId: seed.sessionId,
      userId: removedUserId,
      state: 'REMOVED',
    })

    // Lưu nháp dish1 và dish2
    await saveFinalMealDraft(
      { meal: drizzleMealRepository },
      {
        sessionId: seed.sessionId,
        userId: seed.creatorId,
        dishIds: [seed.dish1.groupDishId, seed.dish2.groupDishId],
      },
    )

    // Chốt session
    const finalize = await finalizeSession(
      {
        meal: drizzleMealRepository,
        rules: drizzleRuleRepository,
        preferences: drizzlePreferenceRepository,
      },
      { sessionId: seed.sessionId, userId: seed.creatorId },
    )
    expect(finalize.ok).toBe(true)

    const result = await drizzleMealRepository.findFinalMeal(seed.sessionId)
    expect(result).not.toBeNull()
    expect(result?.decisionDate).toBe('2026-08-14')
    expect(result?.finalizedByDisplayName).toBe('Creator')
    expect(result?.finalizedAt).toBeInstanceOf(Date)
    expect(result?.dishes).toHaveLength(2)
    expect(result?.dishes.map((d) => d.name)).toEqual(['Món 1', 'Món 2'])

    // Dish 1 có cả MAIN và SOUP, thứ tự MAIN trước SOUP
    const d1 = result?.dishes.find((d) => d.name === 'Món 1')
    expect(d1?.systemTags).toEqual(['MAIN', 'SOUP'])

    // ParticipantNames chứa Creator và Other, KHÔNG chứa Removed User
    expect(result?.participantNames).toContain('Creator')
    expect(result?.participantNames).toContain('Other')
    expect(result?.participantNames).not.toContain('Removed User')
  })

  it('Session ACTIVE có nháp trả về null', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))

    await saveFinalMealDraft(
      { meal: drizzleMealRepository },
      { sessionId: seed.sessionId, userId: seed.creatorId, dishIds: [seed.dish1.groupDishId] },
    )

    const result = await drizzleMealRepository.findFinalMeal(seed.sessionId)
    expect(result).toBeNull()
  })

  it('SessionId không tồn tại trả về null', async () => {
    const result = await drizzleMealRepository.findFinalMeal(crypto.randomUUID())
    expect(result).toBeNull()
  })

  it('TC-138: BR-050 — Chốt bữa sau phiên COURSE hoạt động y hệt phiên FREE', async () => {
    const seed = await seedActiveSessionWithTwoDishes()
    cleanupQueue.push(() => cleanup(seed))

    const db = getDb()
    // Đổi sang deckMode = 'COURSE' và chèn các dòng session_courses
    await db
      .update(selectionSessions)
      .set({ deckMode: 'COURSE' })
      .where(eq(selectionSessions.id, seed.sessionId))

    await db.insert(sessionCourses).values([
      { sessionId: seed.sessionId, position: 0, systemTag: 'MAIN' },
      { sessionId: seed.sessionId, position: 1, systemTag: 'SOUP' },
    ])

    const draft = await saveFinalMealDraft(
      { meal: drizzleMealRepository },
      {
        sessionId: seed.sessionId,
        userId: seed.creatorId,
        dishIds: [seed.dish1.groupDishId, seed.dish2.groupDishId],
      },
    )
    expect(draft.ok).toBe(true)

    const finalize = await finalizeSession(
      {
        meal: drizzleMealRepository,
        rules: drizzleRuleRepository,
        preferences: drizzlePreferenceRepository,
      },
      { sessionId: seed.sessionId, userId: seed.creatorId },
    )
    expect(finalize.ok).toBe(true)

    const session = await db
      .select({ state: selectionSessions.state })
      .from(selectionSessions)
      .where(eq(selectionSessions.id, seed.sessionId))
    expect(session[0]?.state).toBe('FINALIZED')

    // 2 Dish × 2 Participant = 4 dòng eating_history
    const historyRows = await db
      .select()
      .from(eatingHistory)
      .where(eq(eatingHistory.sourceFinalMealId, finalize.ok ? finalize.value.finalMealId : ''))
    expect(historyRows).toHaveLength(4)
  })
})
