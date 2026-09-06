import { and, eq, inArray } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { drizzleSelectionRepository } from '@/features/selection/infrastructure/drizzle-selection-repository'
import { getDb } from '@/shared/db/client'
import {
  globalDishes,
  groupDishes,
  groupMembers,
  groups,
  interactionEvents,
  interactions,
  participants,
  selectionSessions,
  userDishConstraints,
  userDishPreferences,
  userPreferenceSettings,
  users,
} from '@/shared/db/schema'

import { drizzlePreferenceRepository } from './drizzle-preference-repository'

async function seedPreferenceTestData() {
  const db = getDb()
  const userId1 = crypto.randomUUID()
  const userId2 = crypto.randomUUID()
  const groupId = crypto.randomUUID()
  const sessionId = crypto.randomUUID()
  const participantId1 = crypto.randomUUID()
  const participantId2 = crypto.randomUUID()
  const globalDishId = crypto.randomUUID()
  const groupDishId = crypto.randomUUID()

  await db.insert(users).values([
    {
      id: userId1,
      provider: 'test',
      providerSubject: `u1-${userId1}`,
      email: `${userId1}@test.local`,
      displayName: 'Preference User 1',
    },
    {
      id: userId2,
      provider: 'test',
      providerSubject: `u2-${userId2}`,
      email: `${userId2}@test.local`,
      displayName: 'Preference User 2',
    },
  ])

  await db.insert(groups).values({ id: groupId, name: 'Pref Group', timezone: 'UTC' })
  await db.insert(groupMembers).values([
    { groupId, userId: userId1, isAdmin: true },
    { groupId, userId: userId2, isAdmin: false },
  ])

  await db.insert(selectionSessions).values({
    id: sessionId,
    groupId,
    decisionDate: '2026-08-26',
    creatorUserId: userId1,
    state: 'ACTIVE',
  })

  await db.insert(participants).values([
    { id: participantId1, sessionId, userId: userId1, state: 'ACTIVE' },
    { id: participantId2, sessionId, userId: userId2, state: 'ACTIVE' },
  ])

  await db.insert(globalDishes).values({
    id: globalDishId,
    name: 'Món Thử Nghiệm',
    normalizedName: 'món thử nghiệm',
    createdByUserId: userId1,
    createdFromGroupId: groupId,
  })

  await db.insert(groupDishes).values({
    id: groupDishId,
    groupId,
    globalDishId,
    state: 'ACTIVE',
  })

  return {
    userId1,
    userId2,
    groupId,
    sessionId,
    participantId1,
    participantId2,
    globalDishId,
    groupDishId,
  }
}

async function cleanup(seed: Awaited<ReturnType<typeof seedPreferenceTestData>>) {
  const db = getDb()
  await db
    .delete(userDishPreferences)
    .where(inArray(userDishPreferences.userId, [seed.userId1, seed.userId2]))
  await db
    .delete(userDishConstraints)
    .where(inArray(userDishConstraints.userId, [seed.userId1, seed.userId2]))
  await db.delete(interactionEvents).where(eq(interactionEvents.sessionId, seed.sessionId))
  await db.delete(interactions).where(eq(interactions.sessionId, seed.sessionId))
  await db.delete(groupDishes).where(eq(groupDishes.id, seed.groupDishId))
  await db.delete(globalDishes).where(eq(globalDishes.id, seed.globalDishId))
  await db.delete(participants).where(eq(participants.sessionId, seed.sessionId))
  await db.delete(selectionSessions).where(eq(selectionSessions.id, seed.sessionId))
  await db.delete(groupMembers).where(eq(groupMembers.groupId, seed.groupId))
  await db.delete(groups).where(eq(groups.id, seed.groupId))
  await db.delete(users).where(inArray(users.id, [seed.userId1, seed.userId2]))
}

const cleanupQueue: Array<() => Promise<void>> = []

afterEach(async () => {
  while (cleanupQueue.length > 0) {
    const fn = cleanupQueue.pop()
    if (fn !== undefined) await fn()
  }
})

describe('drizzlePreferenceRepository — integration', () => {
  it('TC-114 (ca then chốt): SWIPE_RIGHT rồi Cannot Eat → P giảm đúng 1, interactionEvents ghi CANNOT_EAT', async () => {
    const seed = await seedPreferenceTestData()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    // 1. Cả hai người cùng SWIPE_RIGHT món X
    await db.insert(interactions).values([
      {
        id: crypto.randomUUID(),
        sessionId: seed.sessionId,
        participantId: seed.participantId1,
        groupDishId: seed.groupDishId,
        type: 'SWIPE_RIGHT',
      },
      {
        id: crypto.randomUUID(),
        sessionId: seed.sessionId,
        participantId: seed.participantId2,
        groupDishId: seed.groupDishId,
        type: 'SWIPE_RIGHT',
      },
    ])

    const countsBefore = await drizzleSelectionRepository.countInteractionsByDish(seed.sessionId)
    const dishCountBefore = countsBefore.find((c) => c.groupDishId === seed.groupDishId)
    expect(dishCountBefore?.proposedCount).toBe(2)

    // 2. Người 1 đánh dấu Cannot Eat món X
    const result = await drizzlePreferenceRepository.setConstraint({
      userId: seed.userId1,
      globalDishId: seed.globalDishId,
      kind: 'CANNOT_EAT',
      enabled: true,
    })

    expect(result.removedInteraction).toBe(true)

    // 3. Khẳng định countInteractionsByDish trả P = 1
    const countsAfter = await drizzleSelectionRepository.countInteractionsByDish(seed.sessionId)
    const dishCountAfter = countsAfter.find((c) => c.groupDishId === seed.groupDishId)
    expect(dishCountAfter?.proposedCount).toBe(1)

    // 4. Khẳng định interactions của người 1 đã bị xoá
    const remainingInteractions = await db
      .select()
      .from(interactions)
      .where(
        and(
          eq(interactions.sessionId, seed.sessionId),
          eq(interactions.participantId, seed.participantId1),
        ),
      )
    expect(remainingInteractions).toHaveLength(0)

    // 5. Khẳng định interaction_events có một dòng CANNOT_EAT (§1.5)
    const events = await db
      .select()
      .from(interactionEvents)
      .where(
        and(
          eq(interactionEvents.sessionId, seed.sessionId),
          eq(interactionEvents.participantId, seed.participantId1),
          eq(interactionEvents.groupDishId, seed.groupDishId),
        ),
      )
    expect(events).toHaveLength(1)
    expect(events[0]?.action).toBe('CANNOT_EAT')
  })

  it('TC-115: Gỡ Cannot Eat không khôi phục lượt vuốt cũ và không ghi interaction_events', async () => {
    const seed = await seedPreferenceTestData()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    // Đặt Cannot Eat trước
    await drizzlePreferenceRepository.setConstraint({
      userId: seed.userId1,
      globalDishId: seed.globalDishId,
      kind: 'CANNOT_EAT',
      enabled: true,
    })

    const constrainedBefore = await drizzlePreferenceRepository.findConstrainedGlobalDishIds(
      seed.userId1,
      'CANNOT_EAT',
    )
    expect(constrainedBefore.has(seed.globalDishId)).toBe(true)

    // Gỡ Cannot Eat
    const result = await drizzlePreferenceRepository.setConstraint({
      userId: seed.userId1,
      globalDishId: seed.globalDishId,
      kind: 'CANNOT_EAT',
      enabled: false,
    })

    expect(result.removedInteraction).toBe(false)

    const constrainedAfter = await drizzlePreferenceRepository.findConstrainedGlobalDishIds(
      seed.userId1,
      'CANNOT_EAT',
    )
    expect(constrainedAfter.has(seed.globalDishId)).toBe(false)

    // Khẳng định không có tương tác nào được tạo lại
    const userInteractions = await db
      .select()
      .from(interactions)
      .where(eq(interactions.participantId, seed.participantId1))
    expect(userInteractions).toHaveLength(0)

    // Khẳng định không có event audit mới
    const events = await db
      .select()
      .from(interactionEvents)
      .where(eq(interactionEvents.participantId, seed.participantId1))
    expect(events).toHaveLength(0)
  })

  it('TC-120: setPreference LIKE → DISLIKE → null (xoá dòng, không lưu NEUTRAL)', async () => {
    const seed = await seedPreferenceTestData()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    // 1. LIKE
    await drizzlePreferenceRepository.setPreference({
      userId: seed.userId1,
      globalDishId: seed.globalDishId,
      kind: 'LIKE',
    })

    let prefs = await drizzlePreferenceRepository.findPreferencesByGlobalDish(seed.userId1, [
      seed.globalDishId,
    ])
    expect(prefs.get(seed.globalDishId)).toBe('LIKE')

    // 2. Chuyển sang DISLIKE (upsert)
    await drizzlePreferenceRepository.setPreference({
      userId: seed.userId1,
      globalDishId: seed.globalDishId,
      kind: 'DISLIKE',
    })

    prefs = await drizzlePreferenceRepository.findPreferencesByGlobalDish(seed.userId1, [
      seed.globalDishId,
    ])
    expect(prefs.get(seed.globalDishId)).toBe('DISLIKE')

    // 3. Chuyển sang null (xoá hẳn dòng khỏi DB)
    await drizzlePreferenceRepository.setPreference({
      userId: seed.userId1,
      globalDishId: seed.globalDishId,
      kind: null,
    })

    prefs = await drizzlePreferenceRepository.findPreferencesByGlobalDish(seed.userId1, [
      seed.globalDishId,
    ])
    expect(prefs.get(seed.globalDishId)).toBeUndefined()

    // Xác nhận trực tiếp bảng user_dish_preferences không còn dòng nào
    const rawRows = await db
      .select()
      .from(userDishPreferences)
      .where(
        and(
          eq(userDishPreferences.userId, seed.userId1),
          eq(userDishPreferences.globalDishId, seed.globalDishId),
        ),
      )
    expect(rawRows).toHaveLength(0)
  })

  it('findConstrainedGlobalDishIds và findPreferencesByGlobalDish xử lý danh sách rỗng đúng chuẩn', async () => {
    const seed = await seedPreferenceTestData()
    cleanupQueue.push(() => cleanup(seed))

    const emptyPrefs = await drizzlePreferenceRepository.findPreferencesByGlobalDish(
      seed.userId1,
      [],
    )
    expect(emptyPrefs.size).toBe(0)

    const emptyConstraints = await drizzlePreferenceRepository.findConstrainedGlobalDishIds(
      crypto.randomUUID(),
      'CANNOT_EAT',
    )
    expect(emptyConstraints.size).toBe(0)
  })

  // M3-T3 — Trước E11, phiên bỏ dở của hôm qua vẫn mang state ACTIVE cho tới
  // khi quét lười ở Group Hub chạy. Nên "tối đa một phiên ACTIVE mỗi user" là
  // một giả định SAI, và `.limit(1)` không `ORDER BY` chọn dòng tuỳ ý.
  it('M3-T3: hai phiên ACTIVE (hôm qua + hôm nay) → chỉ tương tác của phiên MỚI NHẤT bị xoá', async () => {
    const seed = await seedPreferenceTestData()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    // Phiên bỏ dở của hôm qua — vẫn ACTIVE vì quét lười chưa chạy.
    //
    // Chọn id sắp TRƯỚC id phiên hôm nay: chỉ mục `participants_session_user_unique`
    // sắp theo `session_id`, nên không có `ORDER BY` thì `.limit(1)` gặp phiên CŨ
    // trước. Đây là thứ biến một lỗi tuỳ hứng theo planner thành một lỗi xác định.
    let staleSessionId = crypto.randomUUID()
    while (staleSessionId >= seed.sessionId) {
      staleSessionId = crypto.randomUUID()
    }
    const staleParticipantId = crypto.randomUUID()
    cleanupQueue.push(async () => {
      await db.delete(interactionEvents).where(eq(interactionEvents.sessionId, staleSessionId))
      await db.delete(interactions).where(eq(interactions.sessionId, staleSessionId))
      await db.delete(participants).where(eq(participants.sessionId, staleSessionId))
      await db.delete(selectionSessions).where(eq(selectionSessions.id, staleSessionId))
    })

    await db.insert(selectionSessions).values({
      id: staleSessionId,
      groupId: seed.groupId,
      decisionDate: '2026-08-25',
      creatorUserId: seed.userId1,
      state: 'ACTIVE',
    })

    // Xoá rồi ghi lại dòng participant của phiên HÔM NAY sau dòng của phiên cũ,
    // để thứ tự vật lý trong heap đặt phiên CŨ lên trước. Không có `ORDER BY`
    // thì `.limit(1)` đi theo đúng thứ tự này — đó là điều kiện làm lỗi hiện ra
    // một cách xác định thay vì tuỳ hứng theo planner.
    await db.delete(participants).where(eq(participants.id, seed.participantId1))
    await db.insert(participants).values({
      id: staleParticipantId,
      sessionId: staleSessionId,
      userId: seed.userId1,
      state: 'ACTIVE',
    })
    await db.insert(participants).values({
      id: seed.participantId1,
      sessionId: seed.sessionId,
      userId: seed.userId1,
      state: 'ACTIVE',
    })

    // Cùng một người vuốt phải cùng một món ở CẢ HAI phiên.
    await db.insert(interactions).values([
      {
        id: crypto.randomUUID(),
        sessionId: staleSessionId,
        participantId: staleParticipantId,
        groupDishId: seed.groupDishId,
        type: 'SWIPE_RIGHT',
      },
      {
        id: crypto.randomUUID(),
        sessionId: seed.sessionId,
        participantId: seed.participantId1,
        groupDishId: seed.groupDishId,
        type: 'SWIPE_RIGHT',
      },
    ])

    const result = await drizzlePreferenceRepository.setConstraint({
      userId: seed.userId1,
      globalDishId: seed.globalDishId,
      kind: 'CANNOT_EAT',
      enabled: true,
    })
    expect(result.removedInteraction).toBe(true)

    // Phiên HÔM NAY (decision_date mới hơn) là phiên bị trừ.
    const todayCounts = await drizzleSelectionRepository.countInteractionsByDish(seed.sessionId)
    expect(todayCounts.find((c) => c.groupDishId === seed.groupDishId)?.proposedCount).toBe(0)

    // BR-061 — tương tác của phiên cũ giữ nguyên, không bị đụng tới.
    const staleCounts = await drizzleSelectionRepository.countInteractionsByDish(staleSessionId)
    expect(staleCounts.find((c) => c.groupDishId === seed.groupDishId)?.proposedCount).toBe(1)
  })

  // M3-T9 — một truy vấn cho cả nhóm, thay cho N lần gọi theo từng người.
  it('M3-T9: findCannotEatPairs trả đúng cặp (người, món), lọc theo cả hai chiều', async () => {
    const seed = await seedPreferenceTestData()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    // Người 1 không ăn được món của bữa; người 2 chỉ khai cho một món KHÁC.
    const otherGlobalDishId = crypto.randomUUID()
    cleanupQueue.push(async () => {
      // `cleanupQueue` chạy LIFO nên hàm này chạy TRƯỚC `cleanup(seed)`; phải tự
      // gỡ ràng buộc trỏ tới món này rồi mới xoá được món.
      await db
        .delete(userDishConstraints)
        .where(eq(userDishConstraints.globalDishId, otherGlobalDishId))
      await db.delete(globalDishes).where(eq(globalDishes.id, otherGlobalDishId))
    })
    await db.insert(globalDishes).values({
      id: otherGlobalDishId,
      name: 'Món Ngoài Bữa',
      normalizedName: `món ngoài bữa ${otherGlobalDishId}`,
      createdByUserId: seed.userId1,
      createdFromGroupId: seed.groupId,
    })

    await db.insert(userDishConstraints).values([
      { userId: seed.userId1, globalDishId: seed.globalDishId },
      { userId: seed.userId2, globalDishId: otherGlobalDishId },
    ])

    const pairs = await drizzlePreferenceRepository.findCannotEatPairs(
      [seed.userId1, seed.userId2],
      [seed.globalDishId],
    )

    expect(pairs.has(`${seed.userId1}:${seed.globalDishId}`)).toBe(true)
    // Món ngoài bữa không được kéo về — lọc theo cả `global_dish_id`.
    expect(pairs.size).toBe(1)

    expect(await drizzlePreferenceRepository.findCannotEatPairs([], [seed.globalDishId])).toEqual(
      new Set(),
    )
    expect(await drizzlePreferenceRepository.findCannotEatPairs([seed.userId1], [])).toEqual(
      new Set(),
    )
  })
})

/**
 * SPEC-038 / E13-T6 — ranh giới Blacklist ↔ Cannot Eat.
 *
 * Hai ca dưới đây là HAI NỬA của cùng một bằng chứng và phải đọc cạnh nhau.
 * `TC-166` khẳng định một thứ KHÔNG xảy ra, và một ca như thế luôn xanh khi cơ
 * chế bị gỡ mất hoàn toàn — nên ca đối chứng `Cannot Eat` là bắt buộc.
 */
describe('setConstraint rẽ nhánh theo kind — SPEC-038 (TC-166, TC-168)', () => {
  it('TC-166 (ca then chốt): đang có SWIPE_RIGHT, bật Blacklist → lượt vuốt CÒN NGUYÊN, P KHÔNG đổi', async () => {
    const seed = await seedPreferenceTestData()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    await db.insert(interactions).values([
      {
        id: crypto.randomUUID(),
        sessionId: seed.sessionId,
        participantId: seed.participantId1,
        groupDishId: seed.groupDishId,
        type: 'SWIPE_RIGHT',
      },
      {
        id: crypto.randomUUID(),
        sessionId: seed.sessionId,
        participantId: seed.participantId2,
        groupDishId: seed.groupDishId,
        type: 'SWIPE_RIGHT',
      },
    ])

    const before = await drizzleSelectionRepository.countInteractionsByDish(seed.sessionId)
    expect(before.find((r) => r.groupDishId === seed.groupDishId)?.proposedCount).toBe(2)

    await drizzlePreferenceRepository.setConstraint({
      userId: seed.userId1,
      globalDishId: seed.globalDishId,
      kind: 'BLACKLIST',
      enabled: true,
    })

    // BR-035 — "đừng gợi ý nữa" là một SỞ THÍCH, và nó không làm cho lượt vuốt
    // hôm nay thành sai. Khác hẳn `Cannot Eat` ở ca dưới.
    const after = await drizzleSelectionRepository.countInteractionsByDish(seed.sessionId)
    expect(after.find((r) => r.groupDishId === seed.groupDishId)?.proposedCount).toBe(2)

    const rows = await db
      .select({ id: interactions.id })
      .from(interactions)
      .where(eq(interactions.sessionId, seed.sessionId))
    expect(rows).toHaveLength(2)

    // Và KHÔNG ghi dòng audit `CANNOT_EAT` — đó là sự kiện của cờ kia.
    const events = await db
      .select({ id: interactionEvents.id })
      .from(interactionEvents)
      .where(eq(interactionEvents.sessionId, seed.sessionId))
    expect(events).toHaveLength(0)

    // Nhưng cờ thì có ghi: món biến khỏi deck ở lần dựng sau (TC-167, đã xanh từ S1).
    const blacklisted = await drizzlePreferenceRepository.findConstrainedGlobalDishIds(
      seed.userId1,
      'BLACKLIST',
    )
    expect(blacklisted.has(seed.globalDishId)).toBe(true)
  })

  it('ĐỐI CHỨNG — cùng tiền đề nhưng bật Cannot Eat: lượt vuốt BỊ XOÁ, P giảm 1', async () => {
    // Không có ca này thì `TC-166` ở trên vẫn xanh kể cả khi nhánh `db.batch`
    // chết hẳn — nó chỉ khẳng định một thứ không xảy ra.
    const seed = await seedPreferenceTestData()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    await db.insert(interactions).values([
      {
        id: crypto.randomUUID(),
        sessionId: seed.sessionId,
        participantId: seed.participantId1,
        groupDishId: seed.groupDishId,
        type: 'SWIPE_RIGHT',
      },
      {
        id: crypto.randomUUID(),
        sessionId: seed.sessionId,
        participantId: seed.participantId2,
        groupDishId: seed.groupDishId,
        type: 'SWIPE_RIGHT',
      },
    ])

    const result = await drizzlePreferenceRepository.setConstraint({
      userId: seed.userId1,
      globalDishId: seed.globalDishId,
      kind: 'CANNOT_EAT',
      enabled: true,
    })
    expect(result.removedInteraction).toBe(true)

    const after = await drizzleSelectionRepository.countInteractionsByDish(seed.sessionId)
    expect(after.find((r) => r.groupDishId === seed.groupDishId)?.proposedCount).toBe(1)

    const events = await db
      .select({ action: interactionEvents.action })
      .from(interactionEvents)
      .where(eq(interactionEvents.sessionId, seed.sessionId))
    expect(events.map((e) => e.action)).toEqual(['CANNOT_EAT'])
  })

  it('TC-168: ba cờ độc lập — gỡ từng cái một, hai cái kia còn nguyên', async () => {
    const seed = await seedPreferenceTestData()
    cleanupQueue.push(() => cleanup(seed))

    for (const kind of ['CANNOT_EAT', 'BLACKLIST', 'HISTORY_WHITELIST'] as const) {
      await drizzlePreferenceRepository.setConstraint({
        userId: seed.userId1,
        globalDishId: seed.globalDishId,
        kind,
        enabled: true,
      })
    }

    const has = async (kind: 'CANNOT_EAT' | 'BLACKLIST' | 'HISTORY_WHITELIST') =>
      (await drizzlePreferenceRepository.findConstrainedGlobalDishIds(seed.userId1, kind)).has(
        seed.globalDishId,
      )

    expect([
      await has('CANNOT_EAT'),
      await has('BLACKLIST'),
      await has('HISTORY_WHITELIST'),
    ]).toEqual([true, true, true])

    await drizzlePreferenceRepository.setConstraint({
      userId: seed.userId1,
      globalDishId: seed.globalDishId,
      kind: 'BLACKLIST',
      enabled: false,
    })

    expect([
      await has('CANNOT_EAT'),
      await has('BLACKLIST'),
      await has('HISTORY_WHITELIST'),
    ]).toEqual([true, false, true])
  })

  it('bật Whitelist KHÔNG chạm tới interactions và KHÔNG trả removedInteraction', async () => {
    const seed = await seedPreferenceTestData()
    cleanupQueue.push(() => cleanup(seed))
    const db = getDb()

    await db.insert(interactions).values({
      id: crypto.randomUUID(),
      sessionId: seed.sessionId,
      participantId: seed.participantId1,
      groupDishId: seed.groupDishId,
      type: 'SWIPE_RIGHT',
    })

    const result = await drizzlePreferenceRepository.setConstraint({
      userId: seed.userId1,
      globalDishId: seed.globalDishId,
      kind: 'HISTORY_WHITELIST',
      enabled: true,
    })

    expect(result.removedInteraction).toBe(false)
    const rows = await db
      .select({ id: interactions.id })
      .from(interactions)
      .where(eq(interactions.sessionId, seed.sessionId))
    expect(rows).toHaveLength(1)
  })
})

describe('resetImplicitPreference — SPEC-040 (TC-171)', () => {
  it('TC-171 (ca then chốt): ghi MỘT mốc, KHÔNG xoá dòng interactions nào', async () => {
    const seed = await seedPreferenceTestData()
    cleanupQueue.push(async () => {
      await getDb()
        .delete(userPreferenceSettings)
        .where(inArray(userPreferenceSettings.userId, [seed.userId1, seed.userId2]))
      await cleanup(seed)
    })
    const db = getDb()

    await db.insert(interactions).values({
      id: crypto.randomUUID(),
      sessionId: seed.sessionId,
      participantId: seed.participantId1,
      groupDishId: seed.groupDishId,
      type: 'SWIPE_RIGHT',
    })

    expect(await drizzlePreferenceRepository.findImplicitResetAt(seed.userId1)).toBeNull()

    const { implicitResetAt } = await drizzlePreferenceRepository.resetImplicitPreference(
      seed.userId1,
    )
    expect(typeof implicitResetAt).toBe('string')
    expect(Number.isNaN(Date.parse(implicitResetAt))).toBe(false)

    // BR-061 — mốc thời gian, KHÔNG phải lệnh xoá.
    const rows = await db
      .select({ id: interactions.id })
      .from(interactions)
      .where(eq(interactions.sessionId, seed.sessionId))
    expect(rows).toHaveLength(1)

    expect(await drizzlePreferenceRepository.findImplicitResetAt(seed.userId1)).toBe(
      implicitResetAt,
    )
  })

  it('bấm Quên lần thứ hai dời mốc về sau — upsert chứ không đổ vì trùng khoá', async () => {
    const seed = await seedPreferenceTestData()
    cleanupQueue.push(async () => {
      await getDb()
        .delete(userPreferenceSettings)
        .where(inArray(userPreferenceSettings.userId, [seed.userId1, seed.userId2]))
      await cleanup(seed)
    })

    const first = await drizzlePreferenceRepository.resetImplicitPreference(seed.userId1)
    const second = await drizzlePreferenceRepository.resetImplicitPreference(seed.userId1)

    expect(Date.parse(second.implicitResetAt)).toBeGreaterThanOrEqual(
      Date.parse(first.implicitResetAt),
    )
  })

  it('TC-173: Quên KHÔNG đụng Like/Dislike và ba cờ cá nhân', async () => {
    const seed = await seedPreferenceTestData()
    cleanupQueue.push(async () => {
      await getDb()
        .delete(userPreferenceSettings)
        .where(inArray(userPreferenceSettings.userId, [seed.userId1, seed.userId2]))
      await cleanup(seed)
    })

    await drizzlePreferenceRepository.setPreference({
      userId: seed.userId1,
      globalDishId: seed.globalDishId,
      kind: 'LIKE',
    })
    for (const kind of ['CANNOT_EAT', 'BLACKLIST', 'HISTORY_WHITELIST'] as const) {
      await drizzlePreferenceRepository.setConstraint({
        userId: seed.userId1,
        globalDishId: seed.globalDishId,
        kind,
        enabled: true,
      })
    }

    await drizzlePreferenceRepository.resetImplicitPreference(seed.userId1)

    // Bốn thứ khai TAY còn nguyên; chỉ thứ hệ thống tự suy ra bị bỏ qua.
    const prefs = await drizzlePreferenceRepository.findPreferencesByGlobalDish(seed.userId1, [
      seed.globalDishId,
    ])
    expect(prefs.get(seed.globalDishId)).toBe('LIKE')

    for (const kind of ['CANNOT_EAT', 'BLACKLIST', 'HISTORY_WHITELIST'] as const) {
      const set = await drizzlePreferenceRepository.findConstrainedGlobalDishIds(seed.userId1, kind)
      expect(set.has(seed.globalDishId)).toBe(true)
    }
  })
})
