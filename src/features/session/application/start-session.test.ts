import { describe, expect, it, vi } from 'vitest'

import { startSession } from './start-session'
import type { SessionForStart, SessionRepository, StartDraftOutcome } from './session-repository'

function makeSession(overrides: Partial<SessionForStart> = {}): SessionForStart {
  return {
    id: 's1',
    groupId: 'g1',
    creatorUserId: 'creator',
    state: 'DRAFT',
    participantUserIds: ['creator'],
    ...overrides,
  }
}

function makeDeps(
  overrides: {
    session?: SessionForStart | null
    invalidParticipants?: { userId: string; displayName: string }[]
    startOutcome?: 'STARTED' | 'NOT_DRAFT' | 'ALREADY_EXISTS_TODAY'
  } = {},
) {
  const sessions: Partial<SessionRepository> = {
    findForStart: vi.fn(async () =>
      overrides.session === undefined ? makeSession() : overrides.session,
    ),
    startDraft: vi.fn(async (): Promise<StartDraftOutcome> => {
      const outcome = overrides.startOutcome ?? 'STARTED'
      if (outcome === 'STARTED') {
        return {
          outcome: 'STARTED',
          session: { id: 's1', groupId: 'g1', decisionDate: '2026-08-19', state: 'ACTIVE' },
        }
      }
      return { outcome }
    }),
  }
  const findInvalidParticipants = vi.fn(async () => overrides.invalidParticipants ?? [])
  return { sessions: sessions as SessionRepository, findInvalidParticipants }
}

describe('startSession', () => {
  it('TC-030 (rút gọn — chưa có rule) — happy path chuyển ACTIVE', async () => {
    const deps = makeDeps()

    const result = await startSession(deps, 's1', 'creator')

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.state).toBe('ACTIVE')
  })

  it('TC-033 — session không còn DRAFT: ERR_SESSION_NOT_DRAFT, không gọi findInvalidParticipants', async () => {
    const deps = makeDeps({ session: makeSession({ state: 'ACTIVE' }) })

    const result = await startSession(deps, 's1', 'creator')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_SESSION_NOT_DRAFT')
    expect(deps.findInvalidParticipants).not.toHaveBeenCalled()
  })

  it('TC-034 — người gọi không phải Creator: ERR_NOT_SESSION_CREATOR', async () => {
    const deps = makeDeps()

    const result = await startSession(deps, 's1', 'nguoi-la')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_NOT_SESSION_CREATOR')
    expect(deps.findInvalidParticipants).not.toHaveBeenCalled()
  })

  it('TC-031 — 1 participant đã rời Group: ERR_PARTICIPANT_NOT_MEMBER kèm tên', async () => {
    const deps = makeDeps({
      session: makeSession({ participantUserIds: ['creator', 'mem-2'] }),
      invalidParticipants: [{ userId: 'mem-2', displayName: 'Chú Tư' }],
    })

    const result = await startSession(deps, 's1', 'creator')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_PARTICIPANT_NOT_MEMBER')
    expect(result.error.details?.['invalidParticipants']).toEqual([
      { userId: 'mem-2', displayName: 'Chú Tư' },
    ])
  })

  it('Creator tự rời Group — bắt được bởi cùng một lệnh gọi (bước 3 = trường hợp riêng của bước 4)', async () => {
    const deps = makeDeps({
      invalidParticipants: [{ userId: 'creator', displayName: 'Bạn' }],
    })

    const result = await startSession(deps, 's1', 'creator')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_PARTICIPANT_NOT_MEMBER')
  })

  it('session không tồn tại: bỏ qua 4 bước đọc, để startDraft tự trả NOT_DRAFT', async () => {
    const deps = makeDeps({ session: null, startOutcome: 'NOT_DRAFT' })

    const result = await startSession(deps, 'khong-ton-tai', 'ai-do')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_SESSION_NOT_DRAFT')
    expect(deps.findInvalidParticipants).not.toHaveBeenCalled()
  })

  it('TC-032/TC-107 — race lúc ghi: ALREADY_EXISTS_TODAY dù 4 bước đọc đều qua', async () => {
    const deps = makeDeps({ startOutcome: 'ALREADY_EXISTS_TODAY' })

    const result = await startSession(deps, 's1', 'creator')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_SESSION_EXISTS_TODAY')
  })

  it('TC-132 — COURSE + courses rỗng: ERR_VALIDATION, không chạm DB', async () => {
    const deps = makeDeps()

    const result = await startSession(deps, 's1', 'creator', {
      deckMode: 'COURSE',
      courses: [],
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_VALIDATION')
    expect(deps.sessions.findForStart).not.toHaveBeenCalled()
    expect(deps.sessions.startDraft).not.toHaveBeenCalled()
  })

  it('COURSE + tag trùng lặp trong courses: ERR_VALIDATION, không chạm DB', async () => {
    const deps = makeDeps()

    const result = await startSession(deps, 's1', 'creator', {
      deckMode: 'COURSE',
      courses: ['MAIN', 'MAIN'],
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_VALIDATION')
    expect(deps.sessions.findForStart).not.toHaveBeenCalled()
    expect(deps.sessions.startDraft).not.toHaveBeenCalled()
  })

  it('COURSE + courses hợp lệ: truyền đúng config xuống startDraft', async () => {
    const deps = makeDeps()

    const result = await startSession(deps, 's1', 'creator', {
      deckMode: 'COURSE',
      courses: ['MAIN', 'SOUP'],
    })

    expect(result.ok).toBe(true)
    expect(deps.sessions.startDraft).toHaveBeenCalledWith('s1', {
      deckMode: 'COURSE',
      courses: ['MAIN', 'SOUP'],
    })
  })
})
