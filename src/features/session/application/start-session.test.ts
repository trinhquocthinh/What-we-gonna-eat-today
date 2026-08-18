import { describe, expect, it } from 'vitest'

import type { SessionRepository, StartDraftOutcome } from './session-repository'
import { startSession } from './start-session'

function makeFakeSessionRepository(outcome: StartDraftOutcome): SessionRepository {
  return {
    async findBlockingSessionToday() {
      return null
    },
    async createDraftWithCreatorParticipant(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async startDraft() {
      return outcome
    },
    async findById(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
  }
}

describe('SPEC-008 rút gọn — Bắt đầu Session', () => {
  it('SPEC-008 rút gọn: Draft hợp lệ thì chuyển ACTIVE', async () => {
    const repository = makeFakeSessionRepository({
      outcome: 'STARTED',
      session: {
        id: 'session-1',
        groupId: 'group-1',
        decisionDate: '2026-08-17',
        state: 'ACTIVE',
      },
    })

    const result = await startSession({ sessions: repository }, 'session-1')

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.state).toBe('ACTIVE')
  })

  it('SPEC-008 rút gọn: session không ở DRAFT thì ERR_SESSION_NOT_DRAFT', async () => {
    const repository = makeFakeSessionRepository({ outcome: 'NOT_DRAFT' })

    const result = await startSession({ sessions: repository }, 'session-1')

    expect(result.ok === false && result.error.code).toBe('ERR_SESSION_NOT_DRAFT')
  })

  it('SPEC-008 rút gọn: đã có Session ACTIVE khác cùng ngày thì ERR_SESSION_EXISTS_TODAY', async () => {
    const repository = makeFakeSessionRepository({ outcome: 'ALREADY_EXISTS_TODAY' })

    const result = await startSession({ sessions: repository }, 'session-1')

    expect(result.ok === false && result.error.code).toBe('ERR_SESSION_EXISTS_TODAY')
  })
})
