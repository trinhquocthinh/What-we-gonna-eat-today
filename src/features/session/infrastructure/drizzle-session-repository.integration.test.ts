import { and, eq, inArray } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { getDb } from '@/shared/db/client'
import {
  globalDishes,
  groupDishes,
  groupMembers,
  groupRules,
  groups,
  interactions,
  participants,
  selectionSessions,
  sessionCourses,
  sessionRules,
  users,
} from '@/shared/db/schema'

import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'

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

  const sessionIds = sessionRows.map((s) => s.id)
  if (sessionIds.length > 0) {
    await db.delete(sessionCourses).where(inArray(sessionCourses.sessionId, sessionIds))
    await db.delete(sessionRules).where(inArray(sessionRules.sessionId, sessionIds))
    await db.delete(interactions).where(inArray(interactions.sessionId, sessionIds))
    await db.delete(participants).where(inArray(participants.sessionId, sessionIds))
  }
  await db.delete(selectionSessions).where(eq(selectionSessions.groupId, groupId))
  await db.delete(groupRules).where(eq(groupRules.groupId, groupId))
  await db.delete(groupDishes).where(eq(groupDishes.groupId, groupId))
  await db.delete(globalDishes).where(eq(globalDishes.createdFromGroupId, groupId))
  if (ids.length > 0) {
    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), inArray(groupMembers.userId, ids)))
  }
  await db.delete(groups).where(eq(groups.id, groupId))
  if (ids.length > 0) {
    await db.delete(users).where(inArray(users.id, ids))
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
      { sessions: drizzleSessionRepository, countActiveDishes: async () => 1 },
      { groupId, creatorUserId: userId, decisionDate },
    )
    if (!first.ok) throw new Error('setup thất bại: không tạo được Session đầu tiên')
    const started = await startSession(
      {
        sessions: drizzleSessionRepository,
        findInvalidParticipants: async () => [],
        findGroupTargetDishCount: async () => null,
      },
      first.value.id,
      userId,
    )
    if (!started.ok) throw new Error('setup thất bại: không Start được Session đầu tiên')

    const second = await createSession(
      { sessions: drizzleSessionRepository, countActiveDishes: async () => 1 },
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
      { sessions: drizzleSessionRepository, countActiveDishes: async () => 1 },
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
      { sessions: drizzleSessionRepository, countActiveDishes: async () => 1 },
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
      { sessions: drizzleSessionRepository, countActiveDishes: async () => 1 },
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

  it('ensureParticipants thêm cả nhà vào phiên và gọi lại KHÔNG nhân đôi', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    const otherUserId = crypto.randomUUID()
    const db = getDb()
    await db.insert(users).values({
      id: otherUserId,
      provider: 'test',
      providerSubject: `integration-${otherUserId}`,
      email: `${otherUserId}@example.test`,
      displayName: 'Người nhà thứ hai',
    })
    await db.insert(groupMembers).values({ groupId, userId: otherUserId, isAdmin: false })
    cleanupQueue.push(() => cleanupGroupAndUser(groupId, [userId, otherUserId]))

    const draft = await createSession(
      { sessions: drizzleSessionRepository, countActiveDishes: async () => 1 },
      { groupId, creatorUserId: userId, decisionDate: '2026-08-17' },
    )
    if (!draft.ok) throw new Error('setup thất bại')

    // Creator đã là Participant sẵn — đây chính là ca `onConflictDoNothing`
    // phải nuốt, không phải ném lỗi unique.
    await drizzleSessionRepository.ensureParticipants(draft.value.id, [userId, otherUserId])
    await drizzleSessionRepository.ensureParticipants(draft.value.id, [userId, otherUserId])

    const rows = await db
      .select({ userId: participants.userId })
      .from(participants)
      .where(eq(participants.sessionId, draft.value.id))

    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.userId)).toEqual(expect.arrayContaining([userId, otherUserId]))
  })

  it('listActiveMembers trả mọi Member còn hiệu lực, bỏ người đã bị gỡ', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    const otherUserId = crypto.randomUUID()
    const removedUserId = crypto.randomUUID()
    const db = getDb()
    await db.insert(users).values([
      {
        id: otherUserId,
        provider: 'test',
        providerSubject: `integration-${otherUserId}`,
        email: `${otherUserId}@example.test`,
        displayName: 'Người nhà thứ hai',
      },
      {
        id: removedUserId,
        provider: 'test',
        providerSubject: `integration-${removedUserId}`,
        email: `${removedUserId}@example.test`,
        displayName: 'Người đã rời nhóm',
      },
    ])
    await db.insert(groupMembers).values([
      { groupId, userId: otherUserId, isAdmin: false },
      { groupId, userId: removedUserId, isAdmin: false, removedAt: new Date() },
    ])
    cleanupQueue.push(() => cleanupGroupAndUser(groupId, [userId, otherUserId, removedUserId]))

    const members = await drizzleMembershipRepository.listActiveMembers(groupId)

    expect(members.map((m) => m.userId)).toEqual([userId, otherUserId])
  })

  it('findDraftToday trả về Draft cũ nếu gọi createSession-flow hai lần trong cùng ngày', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    cleanupQueue.push(() => cleanupGroupAndUser(groupId, userId))
    const decisionDate = '2026-08-17'

    const first = await createSession(
      { sessions: drizzleSessionRepository, countActiveDishes: async () => 1 },
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
      try {
        const decisionDate = '2026-08-17'

        // SPEC-007 cho phép nhiều Draft cùng group+date cùng lúc (BR-025: "Draft
        // và Invalid Session không block việc tạo một valid Session mới").
        const first = await createSession(
          { sessions: drizzleSessionRepository, countActiveDishes: async () => 1 },
          { groupId, creatorUserId: userId, decisionDate },
        )
        const second = await createSession(
          { sessions: drizzleSessionRepository, countActiveDishes: async () => 1 },
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
            {
              sessions: drizzleSessionRepository,
              findInvalidParticipants: async () => [],
              findGroupTargetDishCount: async () => null,
            },
            first.value.id,
            userId,
          ),
          startSession(
            {
              sessions: drizzleSessionRepository,
              findInvalidParticipants: async () => [],
              findGroupTargetDishCount: async () => null,
            },
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
      } finally {
        await cleanupGroupAndUser(groupId, userId)
      }
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

async function seedGroupWithRules(
  rules: readonly {
    systemTag: 'STAPLE' | 'MAIN' | 'SIDE' | 'SOUP' | 'DESSERT'
    minimumCount: number
  }[],
) {
  const { userId, groupId } = await seedGroupAndUser()
  cleanupQueue.push(() => cleanupGroupAndUser(groupId, userId))
  const db = getDb()

  if (rules.length > 0) {
    await db.insert(groupRules).values(
      rules.map((r) => ({
        groupId,
        systemTag: r.systemTag,
        minimumCount: r.minimumCount,
        ruleType: 'REQUIRED' as const,
      })),
    )
  }

  return { userId, groupId, decisionDate: '2026-08-20' }
}

async function createDraft(input: {
  groupId: string
  decisionDate: string
  creatorUserId?: string
}) {
  const db = getDb()
  const sessionId = crypto.randomUUID()
  const userId = input.creatorUserId ?? crypto.randomUUID()

  await db.insert(selectionSessions).values({
    id: sessionId,
    groupId: input.groupId,
    decisionDate: input.decisionDate,
    creatorUserId: userId,
    state: 'DRAFT',
  })

  return sessionId
}

describe('SPEC-022 / E5-T4 — Snapshot Session Rules lúc Start (integration)', () => {
  it('TC-091: Group có 2 rule -> startDraft -> session_rules có đúng 2 dòng', async () => {
    const { groupId, decisionDate, userId } = await seedGroupWithRules([
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'SOUP', minimumCount: 1 },
    ])

    const draft = await createDraft({ groupId, decisionDate, creatorUserId: userId })
    const outcome = await drizzleSessionRepository.startDraft(draft)

    expect(outcome.outcome).toBe('STARTED')

    const rules = await getDb()
      .select({ systemTag: sessionRules.systemTag, minimumCount: sessionRules.minimumCount })
      .from(sessionRules)
      .where(eq(sessionRules.sessionId, draft))

    expect(rules).toHaveLength(2)
    expect(rules).toEqual(
      expect.arrayContaining([
        { systemTag: 'MAIN', minimumCount: 1 },
        { systemTag: 'SOUP', minimumCount: 1 },
      ]),
    )
  })

  it('TC-092: Group 0 rule -> startDraft -> STARTED và session_rules 0 dòng', async () => {
    const { groupId, decisionDate, userId } = await seedGroupWithRules([])

    const draft = await createDraft({ groupId, decisionDate, creatorUserId: userId })
    const outcome = await drizzleSessionRepository.startDraft(draft)

    expect(outcome.outcome).toBe('STARTED')

    const rules = await getDb().select().from(sessionRules).where(eq(sessionRules.sessionId, draft))

    expect(rules).toEqual([])
  })

  it('TC-094: Start lần hai -> NOT_DRAFT và session_rules vẫn nguyên 2 dòng', async () => {
    const { groupId, decisionDate, userId } = await seedGroupWithRules([
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'SOUP', minimumCount: 1 },
    ])

    const draft = await createDraft({ groupId, decisionDate, creatorUserId: userId })
    const first = await drizzleSessionRepository.startDraft(draft)
    expect(first.outcome).toBe('STARTED')

    const second = await drizzleSessionRepository.startDraft(draft)
    expect(second.outcome).toBe('NOT_DRAFT')

    const rules = await getDb().select().from(sessionRules).where(eq(sessionRules.sessionId, draft))

    expect(rules).toHaveLength(2)
  })

  it('TC-090, TC-093: Admin đổi Group Rule sau khi Start -> session_rules của phiên không đổi', async () => {
    const { groupId, decisionDate, userId } = await seedGroupWithRules([
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'SOUP', minimumCount: 1 },
    ])

    const draft = await createDraft({ groupId, decisionDate, creatorUserId: userId })
    const outcome = await drizzleSessionRepository.startDraft(draft)
    expect(outcome.outcome).toBe('STARTED')

    // Admin sửa Group Rule
    const db = getDb()
    await db.delete(groupRules).where(eq(groupRules.groupId, groupId))
    await db.insert(groupRules).values({
      groupId,
      systemTag: 'SIDE',
      minimumCount: 2,
      ruleType: 'REQUIRED',
    })

    const sessionRulesRows = await db
      .select({ systemTag: sessionRules.systemTag, minimumCount: sessionRules.minimumCount })
      .from(sessionRules)
      .where(eq(sessionRules.sessionId, draft))

    expect(sessionRulesRows).toHaveLength(2)
    expect(sessionRulesRows).toEqual(
      expect.arrayContaining([
        { systemTag: 'MAIN', minimumCount: 1 },
        { systemTag: 'SOUP', minimumCount: 1 },
      ]),
    )
  })

  it('TC-035 — Start thất bại thì không có Session Rule nào được tạo', async () => {
    const { groupId, decisionDate, userId } = await seedGroupWithRules([
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'SOUP', minimumCount: 1 },
    ])

    const first = await createDraft({ groupId, decisionDate, creatorUserId: userId })
    const second = await createDraft({ groupId, decisionDate, creatorUserId: userId })

    expect((await drizzleSessionRepository.startDraft(first)).outcome).toBe('STARTED')

    const outcome = await drizzleSessionRepository.startDraft(second)
    expect(outcome.outcome).toBe('ALREADY_EXISTS_TODAY')

    const orphaned = await getDb()
      .select()
      .from(sessionRules)
      .where(eq(sessionRules.sessionId, second))
    expect(orphaned).toEqual([])
  })
})

describe('SPEC-029 / E9-T1 — Snapshot Session Courses lúc Start (integration)', () => {
  it('TC-131: Start COURSE 3 chặng -> session_courses đúng 3 dòng, position 0->2, ghi cùng giao dịch với session_rules', async () => {
    const { groupId, decisionDate, userId } = await seedGroupWithRules([
      { systemTag: 'MAIN', minimumCount: 1 },
    ])

    const draft = await createDraft({ groupId, decisionDate, creatorUserId: userId })
    const outcome = await drizzleSessionRepository.startDraft(draft, {
      deckMode: 'COURSE',
      courses: ['STAPLE', 'MAIN', 'SOUP'],
    })

    expect(outcome.outcome).toBe('STARTED')

    const db = getDb()
    const sessionRow = await db
      .select({ deckMode: selectionSessions.deckMode, state: selectionSessions.state })
      .from(selectionSessions)
      .where(eq(selectionSessions.id, draft))
      .limit(1)

    expect(sessionRow[0]?.deckMode).toBe('COURSE')
    expect(sessionRow[0]?.state).toBe('ACTIVE')

    const courses = await db
      .select({ position: sessionCourses.position, systemTag: sessionCourses.systemTag })
      .from(sessionCourses)
      .where(eq(sessionCourses.sessionId, draft))
      .orderBy(sessionCourses.position)

    expect(courses).toHaveLength(3)
    expect(courses).toEqual([
      { position: 0, systemTag: 'STAPLE' },
      { position: 1, systemTag: 'MAIN' },
      { position: 2, systemTag: 'SOUP' },
    ])

    const rules = await db.select().from(sessionRules).where(eq(sessionRules.sessionId, draft))
    expect(rules).toHaveLength(1)
  })

  it('TC-133: Đổi Group Rule sau khi phiên ACTIVE -> session_courses không đổi', async () => {
    const { groupId, decisionDate, userId } = await seedGroupWithRules([
      { systemTag: 'MAIN', minimumCount: 1 },
    ])

    const draft = await createDraft({ groupId, decisionDate, creatorUserId: userId })
    const outcome = await drizzleSessionRepository.startDraft(draft, {
      deckMode: 'COURSE',
      courses: ['MAIN', 'SOUP'],
    })
    expect(outcome.outcome).toBe('STARTED')

    // Đổi Group Rule
    const db = getDb()
    await db.delete(groupRules).where(eq(groupRules.groupId, groupId))
    await db.insert(groupRules).values({
      groupId,
      systemTag: 'SIDE',
      minimumCount: 2,
      ruleType: 'REQUIRED',
    })

    const courses = await db
      .select({ position: sessionCourses.position, systemTag: sessionCourses.systemTag })
      .from(sessionCourses)
      .where(eq(sessionCourses.sessionId, draft))
      .orderBy(sessionCourses.position)

    expect(courses).toEqual([
      { position: 0, systemTag: 'MAIN' },
      { position: 1, systemTag: 'SOUP' },
    ])
  })

  it('Guard DRAFT: startDraft trên session đã ACTIVE -> NOT_DRAFT và không dòng session_courses nào được ghi', async () => {
    const { groupId, decisionDate, userId } = await seedGroupWithRules([])

    const draft = await createDraft({ groupId, decisionDate, creatorUserId: userId })
    const first = await drizzleSessionRepository.startDraft(draft, {
      deckMode: 'COURSE',
      courses: ['MAIN', 'SOUP'],
    })
    expect(first.outcome).toBe('STARTED')

    // Lần hai với cấu hình khác
    const second = await drizzleSessionRepository.startDraft(draft, {
      deckMode: 'COURSE',
      courses: ['STAPLE', 'DESSERT'],
    })
    expect(second.outcome).toBe('NOT_DRAFT')

    const db = getDb()
    const courses = await db
      .select({ position: sessionCourses.position, systemTag: sessionCourses.systemTag })
      .from(sessionCourses)
      .where(eq(sessionCourses.sessionId, draft))
      .orderBy(sessionCourses.position)

    // Vẫn nguyên 2 dòng của lần đầu
    expect(courses).toEqual([
      { position: 0, systemTag: 'MAIN' },
      { position: 1, systemTag: 'SOUP' },
    ])
  })

  // E10-T3: Đông cứng Target Dish Count lúc Start phiên (BR-015)
  it('E10-T3: Đông cứng Target Dish Count lúc Start phiên (BR-015)', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    const db = getDb()

    // Cấu hình target_dish_count = 4 cho Group
    await db.update(groups).set({ targetDishCount: 4 }).where(eq(groups.id, groupId))

    const decisionDate = '2026-08-20'
    const draft = await createDraft({ groupId, decisionDate, creatorUserId: userId })

    // Start session với targetDishCount = 4
    const started = await drizzleSessionRepository.startDraft(draft, {
      deckMode: 'FREE',
      targetDishCount: 4,
    })
    expect(started.outcome).toBe('STARTED')

    // Admin đổi target_dish_count của Group thành 6
    await db.update(groups).set({ targetDishCount: 6 }).where(eq(groups.id, groupId))

    // selection_sessions.target_dish_count vẫn là 4 (đông cứng)
    const sessionRow = await drizzleSessionRepository.findById(draft)
    expect(sessionRow?.targetDishCount).toBe(4)
  })
})

describe('E11-T1 — invalidateExpiredSessions (integration)', () => {
  it('TC-141: Phiên ACTIVE của hôm qua + quét lười -> phiên chuyển INVALID; tạo phiên mới hôm nay thành công', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    cleanupQueue.push(() => cleanupGroupAndUser(groupId, userId))

    const YESTERDAY = '2026-08-14'
    const TODAY = '2026-08-15'

    // Tạo phiên hôm qua và start để chuyển sang ACTIVE
    const draft = await createDraft({ groupId, decisionDate: YESTERDAY, creatorUserId: userId })
    const startRes = await drizzleSessionRepository.startDraft(draft)
    expect(startRes.outcome).toBe('STARTED')

    // Quét lười với referenceDate = TODAY
    await drizzleSessionRepository.invalidateExpiredSessions(groupId, TODAY)

    // Phiên hôm qua phải chuyển INVALID
    const oldSession = await drizzleSessionRepository.findById(draft)
    expect(oldSession?.state).toBe('INVALID')

    // Tạo phiên hôm nay -> thành công, không bị ERR_SESSION_EXISTS_TODAY
    const todayDraft = await drizzleSessionRepository.createDraftWithCreatorParticipant({
      groupId,
      decisionDate: TODAY,
      creatorUserId: userId,
    })
    expect(todayDraft.id).toBeDefined()
    expect(todayDraft.state).toBe('DRAFT')
  })

  it('Idempotent: gọi invalidateExpiredSessions hai lần liên tiếp -> lần hai không đổi gì', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    cleanupQueue.push(() => cleanupGroupAndUser(groupId, userId))

    const YESTERDAY = '2026-08-14'
    const TODAY = '2026-08-15'

    const draft = await createDraft({ groupId, decisionDate: YESTERDAY, creatorUserId: userId })
    await drizzleSessionRepository.startDraft(draft)

    // Chạy lần 1
    await drizzleSessionRepository.invalidateExpiredSessions(groupId, TODAY)
    const afterFirst = await drizzleSessionRepository.findById(draft)
    expect(afterFirst?.state).toBe('INVALID')

    // Chạy lần 2
    await drizzleSessionRepository.invalidateExpiredSessions(groupId, TODAY)
    const afterSecond = await drizzleSessionRepository.findById(draft)
    expect(afterSecond?.state).toBe('INVALID')
  })

  it('Phiên FINALIZED của hôm qua -> quét KHÔNG đụng tới', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    cleanupQueue.push(() => cleanupGroupAndUser(groupId, userId))
    const db = getDb()

    const YESTERDAY = '2026-08-14'
    const TODAY = '2026-08-15'

    const draft = await createDraft({ groupId, decisionDate: YESTERDAY, creatorUserId: userId })
    await drizzleSessionRepository.startDraft(draft)

    // Chuyển session thành FINALIZED (bữa đã chốt)
    await db
      .update(selectionSessions)
      .set({ state: 'FINALIZED', finalizedAt: new Date() })
      .where(eq(selectionSessions.id, draft))

    // Quét lười
    await drizzleSessionRepository.invalidateExpiredSessions(groupId, TODAY)

    // Vẫn là FINALIZED, không bị thành INVALID
    const session = await drizzleSessionRepository.findById(draft)
    expect(session?.state).toBe('FINALIZED')
  })

  it('TC-157: Phiên có interactions -> quét -> state = "INVALID" và interactions vẫn giữ nguyên số dòng (BR-061)', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    cleanupQueue.push(() => cleanupGroupAndUser(groupId, userId))
    const db = getDb()

    const YESTERDAY = '2026-08-14'
    const TODAY = '2026-08-15'

    const draft = await createDraft({ groupId, decisionDate: YESTERDAY, creatorUserId: userId })
    await drizzleSessionRepository.ensureParticipants(draft, [userId])
    await drizzleSessionRepository.startDraft(draft)

    // Thêm món và participant
    const globalDishId = crypto.randomUUID()
    const groupDishId = crypto.randomUUID()
    await db.insert(globalDishes).values({
      id: globalDishId,
      name: 'Món Test',
      normalizedName: 'mon test',
      createdByUserId: userId,
      createdFromGroupId: groupId,
    })
    await db.insert(groupDishes).values({
      id: groupDishId,
      groupId,
      globalDishId,
      state: 'ACTIVE',
    })

    const participantRows = await db
      .select({ id: participants.id })
      .from(participants)
      .where(eq(participants.sessionId, draft))
    const participantId = participantRows[0]?.id
    if (!participantId) throw new Error('Setup thất bại')

    // Thêm 2 dòng interactions
    await db.insert(interactions).values([
      {
        id: crypto.randomUUID(),
        sessionId: draft,
        participantId,
        groupDishId,
        type: 'SWIPE_RIGHT',
      },
    ])

    const countBefore = await db
      .select()
      .from(interactions)
      .where(eq(interactions.sessionId, draft))
    expect(countBefore).toHaveLength(1)

    // Quét lười
    await drizzleSessionRepository.invalidateExpiredSessions(groupId, TODAY)

    // Phiên chuyển INVALID
    const oldSession = await drizzleSessionRepository.findById(draft)
    expect(oldSession?.state).toBe('INVALID')

    // Bảng interactions VẪN CÒN ĐỦ số dòng (không bị xoá theo cascade)
    const countAfter = await db.select().from(interactions).where(eq(interactions.sessionId, draft))
    expect(countAfter).toHaveLength(1)
  })

  it('TC-028: Có session INVALID hôm nay -> tạo phiên mới thành công', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    cleanupQueue.push(() => cleanupGroupAndUser(groupId, userId))

    const YESTERDAY = '2026-08-14'
    const TODAY = '2026-08-15'

    // Tạo phiên hôm qua treo ACTIVE
    const draft = await createDraft({ groupId, decisionDate: YESTERDAY, creatorUserId: userId })
    await drizzleSessionRepository.startDraft(draft)

    // Quét chạy khi mở Group Hub
    await drizzleSessionRepository.invalidateExpiredSessions(groupId, TODAY)

    // Tạo phiên hôm nay thành công
    const newDraft = await drizzleSessionRepository.createDraftWithCreatorParticipant({
      groupId,
      decisionDate: TODAY,
      creatorUserId: userId,
    })
    expect(newDraft.state).toBe('DRAFT')
    expect(newDraft.decisionDate).toBe(TODAY)
  })
})
