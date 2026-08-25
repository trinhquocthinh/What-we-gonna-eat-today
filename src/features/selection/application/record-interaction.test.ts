import { describe, expect, it, vi } from 'vitest'

import type { InteractionType } from '../domain/interaction'
import type { ParticipantRecord, SelectionRepository } from './selection-repository'
import { recordInteraction } from './record-interaction'

type ApplyCall = { action: string }

function makeFakeSelectionRepository(options: {
  sessionState?: 'DRAFT' | 'ACTIVE' | 'FINALIZED' | 'INVALID' | null
  participant?: ParticipantRecord | null
  dishActive?: boolean
  effective?: InteractionType | null
}) {
  const applyCalls: ApplyCall[] = []
  let effective = options.effective ?? null

  const repository: SelectionRepository = {
    async findParticipant() {
      return options.participant ?? { id: 'participant-1', state: 'ACTIVE' }
    },
    async listEligibleDishCards(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async findSessionState() {
      return options.sessionState ?? 'ACTIVE'
    },
    async isDishActiveInSession() {
      return options.dishActive ?? true
    },
    async applyInteraction(input) {
      applyCalls.push({ action: input.action })
      effective = input.action === 'UNDO' ? null : (input.action as InteractionType)
      return effective
    },
    async findMaterializedDeck(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async materializeDeck(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async findSessionForRanking(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async countInteractionsByDish(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async listRankingParticipantUserIds(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
  }

  return {
    repository,
    applyCalls,
    get effective() {
      return effective
    },
  }
}

const TEST_TIMESTAMP = new Date('2026-08-19T10:00:00Z')
const INPUT = {
  sessionId: 'session-1',
  userId: 'user-1',
  groupDishId: 'dish-1',
  clientTimestamp: TEST_TIMESTAMP,
} as const

describe('SPEC-012 — Ghi Session Interaction và Undo', () => {
  it('TC-048: chưa có interaction, SWIPE_RIGHT thì effective SWIPE_RIGHT, 1 event', async () => {
    const fake = makeFakeSelectionRepository({})

    const result = await recordInteraction(
      { selection: fake.repository },
      { ...INPUT, action: 'SWIPE_RIGHT' },
    )

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.effectiveInteraction).toBe('SWIPE_RIGHT')
    expect(fake.applyCalls).toHaveLength(1)
  })

  it('TC-049: effective SWIPE_RIGHT, SWIPE_LEFT thì effective SWIPE_LEFT', async () => {
    const fake = makeFakeSelectionRepository({ effective: 'SWIPE_RIGHT' })

    const result = await recordInteraction(
      { selection: fake.repository },
      { ...INPUT, action: 'SWIPE_LEFT' },
    )

    expect(result.ok && result.value.effectiveInteraction).toBe('SWIPE_LEFT')
  })

  it('TC-050: effective SWIPE_LEFT, UNDO thì effective null', async () => {
    const fake = makeFakeSelectionRepository({ effective: 'SWIPE_LEFT' })

    const result = await recordInteraction(
      { selection: fake.repository },
      { ...INPUT, action: 'UNDO' },
    )

    expect(result.ok && result.value.effectiveInteraction).toBeNull()
  })

  it('TC-051: chưa có interaction, UNDO thì effective null, không lỗi', async () => {
    const fake = makeFakeSelectionRepository({ effective: null })

    const result = await recordInteraction(
      { selection: fake.repository },
      { ...INPUT, action: 'UNDO' },
    )

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.effectiveInteraction).toBeNull()
  })

  it('TC-052: Session FINALIZED thì ERR_SESSION_NOT_ACTIVE, KHÔNG chạm applyInteraction', async () => {
    const fake = makeFakeSelectionRepository({ sessionState: 'FINALIZED' })

    const result = await recordInteraction(
      { selection: fake.repository },
      { ...INPUT, action: 'SWIPE_RIGHT' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_SESSION_NOT_ACTIVE')
    expect(fake.applyCalls).toHaveLength(0)
  })

  it('SPEC-012: Participant đã bị REMOVED thì ERR_NOT_PARTICIPANT', async () => {
    const fake = makeFakeSelectionRepository({ participant: { id: 'p-1', state: 'REMOVED' } })

    const result = await recordInteraction(
      { selection: fake.repository },
      { ...INPUT, action: 'SWIPE_RIGHT' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_PARTICIPANT')
  })

  it('SPEC-012: Dish không còn Active trong pool thì ERR_DISH_NOT_IN_POOL', async () => {
    const fake = makeFakeSelectionRepository({ dishActive: false })

    const result = await recordInteraction(
      { selection: fake.repository },
      { ...INPUT, action: 'SWIPE_RIGHT' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_DISH_NOT_IN_POOL')
  })

  it('xuyên clientTimestamp xuống applyInteraction nguyên vẹn', async () => {
    const applyInteraction = vi.fn(async () => 'SWIPE_RIGHT' as const)
    const fake = makeFakeSelectionRepository({})
    const repository: SelectionRepository = {
      ...fake.repository,
      applyInteraction,
    }
    const clientTimestamp = new Date('2026-08-19T10:00:00Z')

    await recordInteraction(
      { selection: repository },
      {
        sessionId: 's1',
        userId: 'u1',
        groupDishId: 'gd1',
        action: 'SWIPE_RIGHT',
        clientTimestamp,
      },
    )

    expect(applyInteraction).toHaveBeenCalledWith(expect.objectContaining({ clientTimestamp }))
  })
})
