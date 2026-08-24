import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { afterEach, describe, expect, it } from 'vitest'

import { getDb } from '@/shared/db/client'
import { groupRules, groups, selectionSessions, sessionRules, users } from '@/shared/db/schema'
import { makeGroup, makeUser } from '@/shared/testing/factories'

import { buildSnapshotStatement, drizzleRuleRepository } from './drizzle-rule-repository'

type Cleanable = {
  userIds: string[]
  groupIds: string[]
  sessionIds?: string[]
}

async function cleanupEntities(cleanable: Cleanable) {
  const db = getDb()
  if (cleanable.sessionIds) {
    for (const sessionId of cleanable.sessionIds) {
      await db.delete(sessionRules).where(eq(sessionRules.sessionId, sessionId))
      await db.delete(selectionSessions).where(eq(selectionSessions.id, sessionId))
    }
  }
  for (const groupId of cleanable.groupIds) {
    const sessionRows = await db
      .select({ id: selectionSessions.id })
      .from(selectionSessions)
      .where(eq(selectionSessions.groupId, groupId))
    for (const s of sessionRows) {
      await db.delete(sessionRules).where(eq(sessionRules.sessionId, s.id))
      await db.delete(selectionSessions).where(eq(selectionSessions.id, s.id))
    }
    await db.delete(groupRules).where(eq(groupRules.groupId, groupId))
    await db.delete(groups).where(eq(groups.id, groupId))
  }
  for (const userId of cleanable.userIds) {
    await db.delete(users).where(eq(users.id, userId))
  }
}

const cleanupQueue: Array<() => Promise<void>> = []

afterEach(async () => {
  while (cleanupQueue.length > 0) {
    const fn = cleanupQueue.pop()
    if (fn !== undefined) await fn()
  }
})

async function createGroup(): Promise<string> {
  const db = getDb()
  const user = makeUser({
    id: uuidv7(),
    email: `test-${uuidv7()}@example.com`,
  })
  const group = makeGroup({
    id: uuidv7(),
    creatorUserId: user.id,
  })

  cleanupQueue.push(() =>
    cleanupEntities({
      userIds: [user.id],
      groupIds: [group.id],
    }),
  )

  await db.insert(users).values({
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    provider: 'google',
    providerSubject: `sub-${user.id}`,
  })

  await db.insert(groups).values({
    id: group.id,
    name: group.name,
    timezone: group.timezone,
  })

  return group.id
}

async function createGroupAndSession(
  state: 'DRAFT' | 'ACTIVE' = 'DRAFT',
): Promise<{ groupId: string; sessionId: string; userId: string }> {
  const db = getDb()
  const user = makeUser({
    id: uuidv7(),
    email: `test-${uuidv7()}@example.com`,
  })
  const group = makeGroup({
    id: uuidv7(),
    creatorUserId: user.id,
  })
  const sessionId = uuidv7()

  cleanupQueue.push(() =>
    cleanupEntities({
      userIds: [user.id],
      groupIds: [group.id],
      sessionIds: [sessionId],
    }),
  )

  await db.insert(users).values({
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    provider: 'google',
    providerSubject: `sub-${user.id}`,
  })

  await db.insert(groups).values({
    id: group.id,
    name: group.name,
    timezone: group.timezone,
  })

  await db.insert(selectionSessions).values({
    id: sessionId,
    groupId: group.id,
    decisionDate: '2026-08-20',
    creatorUserId: user.id,
    state,
  })

  return { groupId: group.id, sessionId, userId: user.id }
}

describe('drizzleRuleRepository (Integration)', () => {
  it('ghi đè toàn bộ: lưu [MAIN 1, SOUP 1], rồi lưu [SOUP 2] -> còn đúng 1 hàng với minimumCount = 2', async () => {
    const groupId = await createGroup()

    await drizzleRuleRepository.replaceGroupRules(groupId, [
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'SOUP', minimumCount: 1 },
    ])

    let rules = await drizzleRuleRepository.listGroupRules(groupId)
    expect(rules).toHaveLength(2)

    await drizzleRuleRepository.replaceGroupRules(groupId, [{ systemTag: 'SOUP', minimumCount: 2 }])

    rules = await drizzleRuleRepository.listGroupRules(groupId)
    expect(rules).toHaveLength(1)
    expect(rules[0]?.systemTag).toBe('SOUP')
    expect(rules[0]?.minimumCount).toBe(2)
  })

  // TC-088
  it('TC-088: lưu [] sau khi đã có 2 rule -> listGroupRules trả []', async () => {
    const groupId = await createGroup()

    await drizzleRuleRepository.replaceGroupRules(groupId, [
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'SOUP', minimumCount: 1 },
    ])

    await drizzleRuleRepository.replaceGroupRules(groupId, [])

    const rules = await drizzleRuleRepository.listGroupRules(groupId)
    expect(rules).toEqual([])
  })

  it('thứ tự: lưu [SOUP, STAPLE, MAIN] -> đọc ra theo thứ tự mâm cơm [STAPLE, MAIN, SOUP]', async () => {
    const groupId = await createGroup()

    await drizzleRuleRepository.replaceGroupRules(groupId, [
      { systemTag: 'SOUP', minimumCount: 1 },
      { systemTag: 'STAPLE', minimumCount: 1 },
      { systemTag: 'MAIN', minimumCount: 2 },
    ])

    const rules = await drizzleRuleRepository.listGroupRules(groupId)
    expect(rules.map((r) => r.systemTag)).toEqual(['STAPLE', 'MAIN', 'SOUP'])
  })

  // E5-T2 DoD
  it('DB chặn rule trùng và minimum_count = 0, không phụ thuộc hàm thuần', async () => {
    const groupId = await createGroup()

    await getDb()
      .insert(groupRules)
      .values({ groupId, systemTag: 'MAIN', minimumCount: 1, ruleType: 'REQUIRED' })

    await expect(
      getDb()
        .insert(groupRules)
        .values({ groupId, systemTag: 'MAIN', minimumCount: 2, ruleType: 'REQUIRED' }),
    ).rejects.toThrow()

    await expect(
      getDb()
        .insert(groupRules)
        .values({ groupId, systemTag: 'SOUP', minimumCount: 0, ruleType: 'REQUIRED' }),
    ).rejects.toThrow()
  })

  // TC-091
  it('TC-091: Group có 2 rule, Session DRAFT -> buildSnapshotStatement chép đúng 2 rule', async () => {
    const { groupId, sessionId } = await createGroupAndSession('DRAFT')
    await drizzleRuleRepository.replaceGroupRules(groupId, [
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'SOUP', minimumCount: 2 },
    ])

    const db = getDb()
    await buildSnapshotStatement(db, sessionId)

    const rows = await drizzleRuleRepository.listSessionRules(sessionId)
    expect(rows).toHaveLength(2)
    expect(rows).toEqual([
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'SOUP', minimumCount: 2 },
    ])
  })

  // TC-092
  it('TC-092: Group không rule -> buildSnapshotStatement chép 0 dòng, không lỗi', async () => {
    const { sessionId } = await createGroupAndSession('DRAFT')
    const db = getDb()
    await buildSnapshotStatement(db, sessionId)

    const rows = await drizzleRuleRepository.listSessionRules(sessionId)
    expect(rows).toEqual([])
  })

  // TC-094
  it('TC-094: Chạy snapshot lần 2 khi Session đã ACTIVE -> vẫn 2 dòng', async () => {
    const { groupId, sessionId } = await createGroupAndSession('DRAFT')
    await drizzleRuleRepository.replaceGroupRules(groupId, [
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'SOUP', minimumCount: 1 },
    ])

    const db = getDb()
    await buildSnapshotStatement(db, sessionId)

    // Chuyển session sang ACTIVE
    await db
      .update(selectionSessions)
      .set({ state: 'ACTIVE' })
      .where(eq(selectionSessions.id, sessionId))

    // Chạy snapshot lần 2
    await buildSnapshotStatement(db, sessionId)

    const rows = await drizzleRuleRepository.listSessionRules(sessionId)
    expect(rows).toHaveLength(2)
  })

  // TC-093
  it('TC-093: Sau snapshot, Admin đổi Group Rule -> session_rules không đổi', async () => {
    const { groupId, sessionId } = await createGroupAndSession('DRAFT')
    await drizzleRuleRepository.replaceGroupRules(groupId, [
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'SOUP', minimumCount: 1 },
    ])

    const db = getDb()
    await buildSnapshotStatement(db, sessionId)

    // Đổi rule của Group
    await drizzleRuleRepository.replaceGroupRules(groupId, [{ systemTag: 'SIDE', minimumCount: 3 }])

    const sessionRulesList = await drizzleRuleRepository.listSessionRules(sessionId)
    expect(sessionRulesList).toEqual([
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'SOUP', minimumCount: 1 },
    ])
  })

  it('listSessionRules chỉ trả rule REQUIRED, không trả PREFERRED', async () => {
    const { sessionId } = await createGroupAndSession('DRAFT')
    const db = getDb()

    await db.insert(sessionRules).values([
      { sessionId, ruleType: 'REQUIRED', systemTag: 'SOUP', minimumCount: 1 },
      { sessionId, ruleType: 'PREFERRED', systemTag: 'MAIN', minimumCount: 1 },
    ])

    const rules = await drizzleRuleRepository.listSessionRules(sessionId)
    expect(rules).toEqual([{ systemTag: 'SOUP', minimumCount: 1 }])
  })
})
