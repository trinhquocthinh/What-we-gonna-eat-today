import { describe, expect, it } from 'vitest'

import type { DishCard, ParticipantRecord, SelectionRepository } from './selection-repository'
import { listDeck } from './list-deck'

function makeDishCards(count: number): DishCard[] {
  return Array.from({ length: count }, (_, i) => ({
    dishId: `dish-${i}`,
    name: `Món ${i}`,
    systemTags: [],
    effectiveInteraction: null,
  }))
}

function makeFakeSelectionRepository(options: {
  participant: ParticipantRecord | null
  eligible: DishCard[]
}): SelectionRepository {
  return {
    async findParticipant() {
      return options.participant
    },
    async listEligibleDishCards() {
      return options.eligible
    },
    async findSessionState(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async isDishActiveInSession(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async applyInteraction(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
  }
}

describe('SPEC-011 — Lấy trang deck', () => {
  it('TC-045: deck 30 Dish, cursor=0 thì trả 20 item và nextCursor=20', async () => {
    const repository = makeFakeSelectionRepository({
      participant: { id: 'participant-1', state: 'ACTIVE' },
      eligible: makeDishCards(30),
    })

    const result = await listDeck(
      { selection: repository },
      { sessionId: 'session-1', userId: 'user-1', cursor: 0, pageSize: 20 },
    )

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.items).toHaveLength(20)
    expect(result.ok && result.value.nextCursor).toBe(20)
  })

  it('TC-046: cursor=20 thì trả 10 item và nextCursor=null', async () => {
    const repository = makeFakeSelectionRepository({
      participant: { id: 'participant-1', state: 'ACTIVE' },
      eligible: makeDishCards(30),
    })

    const result = await listDeck(
      { selection: repository },
      { sessionId: 'session-1', userId: 'user-1', cursor: 20, pageSize: 20 },
    )

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.items).toHaveLength(10)
    expect(result.ok && result.value.nextCursor).toBeNull()
  })

  it('TC-047: người gọi không phải Participant thì ERR_NOT_PARTICIPANT', async () => {
    const repository = makeFakeSelectionRepository({
      participant: null,
      eligible: makeDishCards(30),
    })

    const result = await listDeck(
      { selection: repository },
      { sessionId: 'session-1', userId: 'user-la', cursor: 0, pageSize: 20 },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_PARTICIPANT')
  })

  it('SPEC-011: Participant REMOVED cũng bị từ chối như chưa từng tham gia', async () => {
    const repository = makeFakeSelectionRepository({
      participant: { id: 'participant-1', state: 'REMOVED' },
      eligible: makeDishCards(30),
    })

    const result = await listDeck(
      { selection: repository },
      { sessionId: 'session-1', userId: 'user-1', cursor: 0, pageSize: 20 },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_PARTICIPANT')
  })
})
