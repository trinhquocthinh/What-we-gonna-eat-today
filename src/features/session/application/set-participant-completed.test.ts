import { describe, expect, it, vi } from 'vitest'

import { setParticipantCompleted } from './set-participant-completed'
import type { SessionRepository, SessionSummary } from './session-repository'

function makeSession(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return { id: 's1', groupId: 'g1', decisionDate: '2026-08-19', state: 'ACTIVE', ...overrides }
}

function makeDeps(
  overrides: {
    session?: SessionSummary | null
    participantState?: 'ACTIVE' | 'COMPLETED' | 'REMOVED' | null
  } = {},
) {
  const sessions: Partial<SessionRepository> = {
    findById: vi.fn(async () =>
      overrides.session === undefined ? makeSession() : overrides.session,
    ),
    findParticipantState: vi.fn(async () =>
      overrides.participantState === undefined ? 'ACTIVE' : overrides.participantState,
    ),
    setParticipantState: vi.fn(async () => ({ outcome: 'UPDATED' as const })),
  }
  return sessions as SessionRepository
}

const BASE_INPUT = { sessionId: 's1', userId: 'u1' }

describe('setParticipantCompleted', () => {
  it('TC-054 — ACTIVE gửi completed=true: chuyển COMPLETED', async () => {
    const sessions = makeDeps()

    const result = await setParticipantCompleted({ sessions }, { ...BASE_INPUT, completed: true })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.state).toBe('COMPLETED')
    expect(sessions.setParticipantState).toHaveBeenCalledWith('s1', 'u1', 'COMPLETED')
  })

  it('TC-056 — COMPLETED gửi completed=false: chuyển lại ACTIVE', async () => {
    const sessions = makeDeps({ participantState: 'COMPLETED' })

    const result = await setParticipantCompleted({ sessions }, { ...BASE_INPUT, completed: false })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.state).toBe('ACTIVE')
    expect(sessions.setParticipantState).toHaveBeenCalledWith('s1', 'u1', 'ACTIVE')
  })

  it('TC-057 — Session đã FINALIZED: ERR_SESSION_NOT_ACTIVE, không ghi gì', async () => {
    const sessions = makeDeps({ session: makeSession({ state: 'FINALIZED' }) })

    const result = await setParticipantCompleted({ sessions }, { ...BASE_INPUT, completed: true })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_SESSION_NOT_ACTIVE')
    expect(sessions.setParticipantState).not.toHaveBeenCalled()
  })

  it('caller không phải Participant của session: ERR_NOT_PARTICIPANT', async () => {
    const sessions = makeDeps({ participantState: null })

    const result = await setParticipantCompleted({ sessions }, { ...BASE_INPUT, completed: true })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_NOT_PARTICIPANT')
  })

  it('participant REMOVED: ERR_NOT_PARTICIPANT', async () => {
    const sessions = makeDeps({ participantState: 'REMOVED' })

    const result = await setParticipantCompleted({ sessions }, { ...BASE_INPUT, completed: true })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_NOT_PARTICIPANT')
  })

  it('gửi completed=true khi đã COMPLETED: idempotent, không lỗi', async () => {
    const sessions = makeDeps({ participantState: 'COMPLETED' })

    const result = await setParticipantCompleted({ sessions }, { ...BASE_INPUT, completed: true })

    expect(result.ok).toBe(true)
  })
})
