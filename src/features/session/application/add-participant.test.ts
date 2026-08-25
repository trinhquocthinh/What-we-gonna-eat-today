import { describe, expect, it, vi } from 'vitest'

import { addParticipant } from './add-participant'
import type {
  AddParticipantOutcome,
  SessionForStart,
  SessionRepository,
} from './session-repository'

function makeSession(overrides: Partial<SessionForStart> = {}): SessionForStart {
  return {
    id: 's1',
    groupId: 'g1',
    creatorUserId: 'creator',
    state: 'ACTIVE',
    participantUserIds: ['creator'],
    ...overrides,
  }
}

function makeDeps(
  overrides: {
    session?: SessionForStart | null
    isMember?: boolean
    addOutcome?: 'ADDED' | 'ALREADY_EXISTS'
  } = {},
) {
  const sessions: Partial<SessionRepository> = {
    findForStart: vi.fn(async () =>
      overrides.session === undefined ? makeSession() : overrides.session,
    ),
    addParticipant: vi.fn(async (): Promise<AddParticipantOutcome> => {
      const outcome = overrides.addOutcome ?? 'ADDED'
      return outcome === 'ADDED'
        ? { outcome: 'ADDED', participantId: 'p-new' }
        : { outcome: 'ALREADY_EXISTS' }
    }),
  }
  const isActiveGroupMember = vi.fn(async () => overrides.isMember ?? true)
  return { sessions: sessions as SessionRepository, isActiveGroupMember }
}

const BASE_INPUT = { sessionId: 's1', userId: 'mem-2', requestedByUserId: 'creator' }

describe('addParticipant', () => {
  it('TC-036 — Session ACTIVE, User là Member: tạo Participant', async () => {
    const deps = makeDeps()

    const result = await addParticipant(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.participantId).toBe('p-new')
  })

  it('Session DRAFT cũng thêm được — SPEC-009 cho phép cả hai trạng thái', async () => {
    const deps = makeDeps({ session: makeSession({ state: 'DRAFT' }) })

    const result = await addParticipant(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
  })

  it('TC-037 — User không thuộc Group: ERR_PARTICIPANT_NOT_MEMBER, không ghi gì', async () => {
    const deps = makeDeps({ isMember: false })

    const result = await addParticipant(deps, BASE_INPUT)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_PARTICIPANT_NOT_MEMBER')
    expect(deps.sessions.addParticipant).not.toHaveBeenCalled()
  })

  it('TC-039 — Session đã FINALIZED: ERR_SESSION_NOT_ACTIVE', async () => {
    const deps = makeDeps({ session: makeSession({ state: 'FINALIZED' }) })

    const result = await addParticipant(deps, BASE_INPUT)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_SESSION_NOT_ACTIVE')
    expect(deps.isActiveGroupMember).not.toHaveBeenCalled()
  })

  it('Session INVALID: cùng ERR_SESSION_NOT_ACTIVE (không có TC riêng, suy từ SPEC-009)', async () => {
    const deps = makeDeps({ session: makeSession({ state: 'INVALID' }) })

    const result = await addParticipant(deps, BASE_INPUT)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_SESSION_NOT_ACTIVE')
  })

  it('Người gọi không phải Creator: ERR_NOT_SESSION_CREATOR', async () => {
    const deps = makeDeps()

    const result = await addParticipant(deps, { ...BASE_INPUT, requestedByUserId: 'ai-do-khac' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_NOT_SESSION_CREATOR')
  })

  it('port báo ALREADY_EXISTS: dịch thành ERR_PARTICIPANT_EXISTS (đường mock — TC-038 thật ở tầng I, §5.1)', async () => {
    const deps = makeDeps({ addOutcome: 'ALREADY_EXISTS' })

    const result = await addParticipant(deps, BASE_INPUT)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_PARTICIPANT_EXISTS')
  })
})
