import { describe, expect, it } from 'vitest'

import { makeGroup, makeUser } from '@/shared/testing/factories'

import { createSession } from './create-session'
import type { NewSessionDraft, SessionRepository, SessionSummary } from './session-repository'

type Row = NewSessionDraft & { id: string; state: 'DRAFT' }

/** Cổng giả là object thuần, không auto-mock (Test Cases §1.3). */
function makeFakeSessionRepository(seed: Row[] = []) {
  const rows: Row[] = [...seed]

  const repository: SessionRepository = {
    async findBlockingSessionToday() {
      // S4 chỉ có DRAFT/ACTIVE khả thi trong repo giả — "blocking" được mô
      // phỏng qua `seed` chứa sẵn một hàng coi như ACTIVE/FINALIZED.
      return null
    },
    async createDraftWithCreatorParticipant(input) {
      const id = `session-${rows.length + 1}`
      rows.push({ ...input, id, state: 'DRAFT' })
      return { id, groupId: input.groupId, decisionDate: input.decisionDate, state: 'DRAFT' }
    },
    async startDraft(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async findById(): Promise<SessionSummary | null> {
      throw new Error('không dùng trong test này')
    },
    async findDraftToday() {
      return null
    },
    async findForStart() {
      return null
    },
    async addParticipant(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async findParticipantState() {
      return null
    },
    async setParticipantState() {
      return { outcome: 'UPDATED' }
    },
    async findSessionOverview() {
      return null
    },
  }

  return { repository, rows }
}

/** Biến thể chặn — mô phỏng đã có Session ACTIVE/FINALIZED hôm nay. */
function makeBlockingFakeSessionRepository(): SessionRepository {
  const base = makeFakeSessionRepository().repository
  return {
    ...base,
    async findBlockingSessionToday() {
      return { id: 'session-blocking', state: 'ACTIVE' }
    },
  }
}

const GROUP_ID = makeGroup().id
const CREATOR = makeUser().id
const DECISION_DATE = '2026-08-17'

describe('SPEC-007 — Tạo Session', () => {
  it('TC-026: chưa có Session hôm nay thì tạo DRAFT, người tạo là Creator kiêm Participant', async () => {
    const fake = makeFakeSessionRepository()

    const result = await createSession(
      { sessions: fake.repository },
      { groupId: GROUP_ID, creatorUserId: CREATOR, decisionDate: DECISION_DATE },
    )

    expect(result.ok).toBe(true)
    expect(fake.rows).toHaveLength(1)
    expect(fake.rows[0]?.state).toBe('DRAFT')
    expect(fake.rows[0]?.creatorUserId).toBe(CREATOR)
    expect((result as { ok: true; value: SessionSummary }).value.state).toBe('DRAFT')
  })

  it('SPEC-007: đã có Session chặn hôm nay thì ERR_SESSION_EXISTS_TODAY và KHÔNG ghi thêm', async () => {
    const repository = makeBlockingFakeSessionRepository()
    let createCalls = 0
    const spied: SessionRepository = {
      ...repository,
      async createDraftWithCreatorParticipant(input) {
        createCalls += 1
        return repository.createDraftWithCreatorParticipant(input)
      },
    }

    const result = await createSession(
      { sessions: spied },
      { groupId: GROUP_ID, creatorUserId: CREATOR, decisionDate: DECISION_DATE },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_SESSION_EXISTS_TODAY')
    expect(createCalls).toBe(0)
  })
})
