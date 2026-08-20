import { and, eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { getDb } from '@/shared/db/client'
import {
  globalDishes,
  groupDishes,
  groupMembers,
  groups,
  interactions,
  participants,
  selectionSessions,
  users,
} from '@/shared/db/schema'

import { createSession } from '../application/create-session'
import { startSession } from '../application/start-session'
import { drizzleSessionRepository } from './drizzle-session-repository'

/**
 * Seed User + Group trực tiếp bằng insert qua `getDb()`, KHÔNG mượn
 * `drizzleUserRepository`/`drizzleGroupRepository` của feature khác. ESLint
 * nới `import/no-restricted-paths` cho file test nên cross-feature import kỹ
 * thuật là hợp lệ, nhưng test của `session` không nên phụ thuộc vào chi tiết
 * nội bộ của `auth`/`group` còn nguyên vẹn — insert thẳng vào bảng là cách
 * duy nhất tách bạch hoàn toàn.
 */
async function seedGroupAndUser() {
  const db = getDb()
  const userId = crypto.randomUUID()
  const groupId = crypto.randomUUID()

  await db.insert(users).values({
    id: userId,
    provider: 'test',
    providerSubject: `integration-${userId}`,
    email: `${userId}@example.test`,
    displayName: 'Integration Test User',
  })
  await db.insert(groups).values({ id: groupId, name: 'Integration Test Group', timezone: 'UTC' })
  await db.insert(groupMembers).values({ groupId, userId, isAdmin: true })

  return { userId, groupId }
}

async function cleanupGroupAndUser(groupId: string, userIds: string | string[]) {
  const ids = Array.isArray(userIds) ? userIds : [userIds]
  const db = getDb()
  const sessionRows = await db
    .select({ id: selectionSessions.id })
    .from(selectionSessions)
    .where(eq(selectionSessions.groupId, groupId))

  for (const s of sessionRows) {
    await db.delete(interactions).where(eq(interactions.sessionId, s.id))
    await db.delete(participants).where(eq(participants.sessionId, s.id))
  }
  await db.delete(selectionSessions).where(eq(selectionSessions.groupId, groupId))
  await db.delete(groupDishes).where(eq(groupDishes.groupId, groupId))
  await db.delete(globalDishes).where(eq(globalDishes.createdFromGroupId, groupId))
  for (const uid of ids) {
    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, uid)))
  }
  await db.delete(groups).where(eq(groups.id, groupId))
  for (const uid of ids) {
    await db.delete(users).where(eq(users.id, uid))
  }
}

const cleanupQueue: Array<() => Promise<void>> = []

afterEach(async () => {
  // Dọn theo thứ tự NGƯỢC với thứ tự tạo — FK đi từ participants → sessions →
  // group_members → groups → users.
  while (cleanupQueue.length > 0) {
    const cleanup = cleanupQueue.pop()
    if (cleanup !== undefined) {
      await cleanup()
    }
  }
})

describe('SPEC-007 — Tạo Session (integration)', () => {
  it('TC-027: đã có Session ACTIVE hôm nay thì ERR_SESSION_EXISTS_TODAY', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    cleanupQueue.push(() => cleanupGroupAndUser(groupId, userId))
    const decisionDate = '2026-08-17'

    const first = await createSession(
      { sessions: drizzleSessionRepository },
      { groupId, creatorUserId: userId, decisionDate },
    )
    if (!first.ok) throw new Error('setup thất bại: không tạo được Session đầu tiên')
    const started = await startSession(
      { sessions: drizzleSessionRepository, findInvalidParticipants: async () => [] },
      first.value.id,
      userId,
    )
    if (!started.ok) throw new Error('setup thất bại: không Start được Session đầu tiên')

    const second = await createSession(
      { sessions: drizzleSessionRepository },
      { groupId, creatorUserId: userId, decisionDate },
    )

    expect(second.ok === false && second.error.code).toBe('ERR_SESSION_EXISTS_TODAY')
  })

  it('TC-028: có Session INVALID hôm nay thì vẫn tạo được Session mới', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    cleanupQueue.push(() => cleanupGroupAndUser(groupId, userId))
    const decisionDate = '2026-08-17'
    const db = getDb()

    // INVALID không tới được qua use case ở v1.0 (Tech Spec §3.2) — seed trực
    // tiếp để mô phỏng trạng thái mà một tính năng tương lai (Cancel Session)
    // sẽ tạo ra.
    const invalidSessionId = crypto.randomUUID()
    await db.insert(selectionSessions).values({
      id: invalidSessionId,
      groupId,
      decisionDate,
      creatorUserId: userId,
      state: 'INVALID',
    })

    const result = await createSession(
      { sessions: drizzleSessionRepository },
      { groupId, creatorUserId: userId, decisionDate },
    )

    expect(result.ok).toBe(true)
  })

  it('TC-029: đã có Session FINALIZED hôm nay thì ERR_SESSION_EXISTS_TODAY', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    cleanupQueue.push(() => cleanupGroupAndUser(groupId, userId))
    const decisionDate = '2026-08-17'
    const db = getDb()

    const finalizedSessionId = crypto.randomUUID()
    await db.insert(selectionSessions).values({
      id: finalizedSessionId,
      groupId,
      decisionDate,
      creatorUserId: userId,
      state: 'FINALIZED',
    })

    const result = await createSession(
      { sessions: drizzleSessionRepository },
      { groupId, creatorUserId: userId, decisionDate },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_SESSION_EXISTS_TODAY')
  })

  it('findForStart trả đủ participantUserIds, kể cả khi có nhiều người', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    const otherUserId = crypto.randomUUID()
    const db = getDb()
    await db.insert(users).values({
      id: otherUserId,
      provider: 'test',
      providerSubject: `integration-${otherUserId}`,
      email: `${otherUserId}@example.test`,
      displayName: 'Other User',
    })
    cleanupQueue.push(() => cleanupGroupAndUser(groupId, [userId, otherUserId]))

    const decisionDate = '2026-08-17'
    const draft = await createSession(
      { sessions: drizzleSessionRepository },
      { groupId, creatorUserId: userId, decisionDate },
    )
    if (!draft.ok) throw new Error('setup thất bại')

    await db.insert(participants).values({
      id: crypto.randomUUID(),
      sessionId: draft.value.id,
      userId: otherUserId,
      state: 'ACTIVE',
    })

    const forStart = await drizzleSessionRepository.findForStart(draft.value.id)
    expect(forStart).not.toBeNull()
    expect(forStart?.participantUserIds).toHaveLength(2)
    expect(forStart?.participantUserIds).toContain(userId)
    expect(forStart?.participantUserIds).toContain(otherUserId)
  })

  it('findDraftToday trả về Draft cũ nếu gọi createSession-flow hai lần trong cùng ngày', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    cleanupQueue.push(() => cleanupGroupAndUser(groupId, userId))
    const decisionDate = '2026-08-17'

    const first = await createSession(
      { sessions: drizzleSessionRepository },
      { groupId, creatorUserId: userId, decisionDate },
    )
    if (!first.ok) throw new Error('setup thất bại')

    const draft = await drizzleSessionRepository.findDraftToday(groupId, decisionDate)
    expect(draft).not.toBeNull()
    expect(draft?.id).toBe(first.value.id)
    expect(draft?.state).toBe('DRAFT')
  })
})

describe('BR-025 — race condition khi Start (TC-107)', () => {
  it('TC-107: hai Start đồng thời cho hai Draft cùng group+date, đúng một thành công', async () => {
    // Lặp 5 vòng trong MỘT test: TC-107 là phép đo race condition, không phải
    // khẳng định logic thuần tuý — một lần "ăn may" không chứng minh gì. Nếu
    // vòng nào cũng ra đúng-một-thắng thì mới tin cậy được partial unique
    // index chặn đúng.
    for (let round = 0; round < 5; round += 1) {
      const { userId, groupId } = await seedGroupAndUser()
      cleanupQueue.push(() => cleanupGroupAndUser(groupId, userId))
      const decisionDate = '2026-08-17'

      // SPEC-007 cho phép nhiều Draft cùng group+date cùng lúc (BR-025: "Draft
      // và Invalid Session không block việc tạo một valid Session mới").
      const first = await createSession(
        { sessions: drizzleSessionRepository },
        { groupId, creatorUserId: userId, decisionDate },
      )
      const second = await createSession(
        { sessions: drizzleSessionRepository },
        { groupId, creatorUserId: userId, decisionDate },
      )
      if (!first.ok || !second.ok) {
        throw new Error(`setup thất bại ở vòng ${round}: không tạo được hai Draft`)
      }

      // Promise.allSettled, KHÔNG Promise.all: nếu implementation lỡ throw
      // thay vì trả Result, allSettled vẫn cho thấy cả hai nhánh thay vì làm
      // toàn bộ test fail ở đúng chỗ cần quan sát nhất.
      const [outcomeA, outcomeB] = await Promise.allSettled([
        startSession(
          { sessions: drizzleSessionRepository, findInvalidParticipants: async () => [] },
          first.value.id,
          userId,
        ),
        startSession(
          { sessions: drizzleSessionRepository, findInvalidParticipants: async () => [] },
          second.value.id,
          userId,
        ),
      ])

      const results = [outcomeA, outcomeB].map((settled) =>
        settled.status === 'fulfilled' ? settled.value : null,
      )

      const succeeded = results.filter((r) => r?.ok === true)
      const blocked = results.filter(
        (r) => r?.ok === false && r.error.code === 'ERR_SESSION_EXISTS_TODAY',
      )

      expect(outcomeA.status, `vòng ${round}: startSession không được throw`).toBe('fulfilled')
      expect(outcomeB.status, `vòng ${round}: startSession không được throw`).toBe('fulfilled')
      expect(succeeded, `vòng ${round}: đúng một Start thành công`).toHaveLength(1)
      expect(blocked, `vòng ${round}: đúng một Start bị chặn`).toHaveLength(1)
    }
  })
})

describe('SPEC-009 — Thêm Participant (integration)', () => {
  it('TC-038 — thêm trùng userId+sessionId: lần hai ALREADY_EXISTS, không tạo hàng thứ hai', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    const secondUserId = crypto.randomUUID()
    const db = getDb()
    await db.insert(users).values({
      id: secondUserId,
      provider: 'test',
      providerSubject: `integration-${secondUserId}`,
      email: `${secondUserId}@example.test`,
      displayName: 'Second User',
    })
    cleanupQueue.push(() => cleanupGroupAndUser(groupId, [userId, secondUserId]))

    const session = await drizzleSessionRepository.createDraftWithCreatorParticipant({
      groupId,
      decisionDate: '2026-08-19',
      creatorUserId: userId,
    })

    const first = await drizzleSessionRepository.addParticipant({
      sessionId: session.id,
      userId: secondUserId,
    })
    const second = await drizzleSessionRepository.addParticipant({
      sessionId: session.id,
      userId: secondUserId,
    })

    expect(first.outcome).toBe('ADDED')
    expect(second.outcome).toBe('ALREADY_EXISTS')
    const rows = await db.select().from(participants).where(eq(participants.userId, secondUserId))
    expect(rows).toHaveLength(1)
  })
})

describe('SPEC-013 / S3 — findParticipantState & setParticipantState (integration)', () => {
  it('TC-054/TC-056 — đổi qua lại COMPLETED/ACTIVE, đọc lại đúng giá trị', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    cleanupQueue.push(() => cleanupGroupAndUser(groupId, userId))

    const session = await drizzleSessionRepository.createDraftWithCreatorParticipant({
      groupId,
      decisionDate: '2026-08-19',
      creatorUserId: userId,
    })

    expect(await drizzleSessionRepository.findParticipantState(session.id, userId)).toBe('ACTIVE')

    await drizzleSessionRepository.setParticipantState(session.id, userId, 'COMPLETED')
    expect(await drizzleSessionRepository.findParticipantState(session.id, userId)).toBe(
      'COMPLETED',
    )

    await drizzleSessionRepository.setParticipantState(session.id, userId, 'ACTIVE')
    expect(await drizzleSessionRepository.findParticipantState(session.id, userId)).toBe('ACTIVE')
  })
})

describe('E3-T6 — findSessionOverview (integration)', () => {
  it('findSessionOverview đếm đúng proposedCount và totalInteractions cho từng participant', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    const secondUserId = crypto.randomUUID()
    const db = getDb()
    await db.insert(users).values({
      id: secondUserId,
      provider: 'test',
      providerSubject: `integration-${secondUserId}`,
      email: `${secondUserId}@example.test`,
      displayName: 'Second User',
    })
    cleanupQueue.push(() => cleanupGroupAndUser(groupId, [userId, secondUserId]))

    const session = await drizzleSessionRepository.createDraftWithCreatorParticipant({
      groupId,
      decisionDate: '2026-08-19',
      creatorUserId: userId,
    })

    const added = await drizzleSessionRepository.addParticipant({
      sessionId: session.id,
      userId: secondUserId,
    })
    if (added.outcome !== 'ADDED') throw new Error('addParticipant setup failed')

    const creatorParticipants = await db
      .select({ id: participants.id })
      .from(participants)
      .where(and(eq(participants.sessionId, session.id), eq(participants.userId, userId)))
    const creatorParticipantId = creatorParticipants[0]!.id

    const globalDishId = crypto.randomUUID()
    const groupDishId = crypto.randomUUID()
    await db.insert(globalDishes).values({
      id: globalDishId,
      name: 'Món Test',
      normalizedName: 'mon test',
      createdFromGroupId: groupId,
      createdByUserId: userId,
    })
    await db.insert(groupDishes).values({
      id: groupDishId,
      groupId,
      globalDishId,
      state: 'ACTIVE',
    })

    await db.insert(interactions).values([
      {
        id: crypto.randomUUID(),
        sessionId: session.id,
        participantId: creatorParticipantId,
        groupDishId,
        type: 'SWIPE_RIGHT',
      },
    ])

    const overview = await drizzleSessionRepository.findSessionOverview(session.id)
    expect(overview).not.toBeNull()
    expect(overview?.id).toBe(session.id)
    expect(overview?.participants).toHaveLength(2)

    const creatorProgress = overview?.participants.find((p) => p.userId === userId)
    expect(creatorProgress).toBeDefined()
    expect(creatorProgress?.proposedCount).toBe(1)
    expect(creatorProgress?.totalInteractions).toBe(1)
    expect(creatorProgress?.displayName).toBe('Integration Test User')

    const secondProgress = overview?.participants.find((p) => p.userId === secondUserId)
    expect(secondProgress).toBeDefined()
    expect(secondProgress?.proposedCount).toBe(0)
    expect(secondProgress?.totalInteractions).toBe(0)
    expect(secondProgress?.displayName).toBe('Second User')
  })
})
