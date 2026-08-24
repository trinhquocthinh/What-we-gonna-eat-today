import { describe, expect, it, vi } from 'vitest'

import type { HistoryRepository } from '@/features/history/application/history-repository'
import { listDeck } from './list-deck'
import type { DishCard, SelectionRepository } from './selection-repository'

function makeDishCard(overrides: Partial<DishCard> = {}): DishCard {
  return {
    dishId: 'gd-1',
    globalDishId: 'gld-1',
    name: 'Canh chua',
    systemTags: [],
    effectiveInteraction: null,
    daysSinceLastEaten: null,
    ...overrides,
  }
}

function makeDeps(
  overrides: {
    eligible?: DishCard[]
    materialized?: readonly string[] | null
    eatingRows?: { globalDishId: string; eatingDate: string }[]
  } = {},
) {
  const materializeDeck = vi.fn(async () => ({ outcome: 'MATERIALIZED' as const }))
  const selection: Partial<SelectionRepository> = {
    findParticipant: vi.fn(async () => ({ id: 'p-1', state: 'ACTIVE' as const })),
    listEligibleDishCards: vi.fn(async () => overrides.eligible ?? [makeDishCard()]),
    findMaterializedDeck: vi.fn(async () => overrides.materialized ?? null),
    materializeDeck,
  }
  const history: HistoryRepository = {
    findEatingDates: vi.fn(async () => overrides.eatingRows ?? []),
    countRecentEatersByDish: vi.fn(async () => new Map()),
    findEatingHistory: vi.fn(async () => []),
  }
  return { selection: selection as SelectionRepository, history, materializeDeck }
}

const BASE_INPUT = {
  sessionId: 's1',
  userId: 'u1',
  cursor: 0,
  pageSize: 20,
  referenceDate: '2026-08-19',
}

describe('listDeck — E4-T3/T4', () => {
  it('TC-103 — cursor âm: ERR_VALIDATION, không chạm DB', async () => {
    const deps = makeDeps()

    const result = await listDeck(deps, { ...BASE_INPUT, cursor: -1 })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_VALIDATION')
    expect(deps.selection.findParticipant).not.toHaveBeenCalled()
  })

  it('lần đầu mở deck: gọi history, materialize đúng một lần', async () => {
    const deps = makeDeps({
      eligible: [makeDishCard({ dishId: 'a' }), makeDishCard({ dishId: 'b' })],
    })

    await listDeck(deps, BASE_INPUT)

    expect(deps.history.findEatingDates).toHaveBeenCalledOnce()
    expect(deps.materializeDeck).toHaveBeenCalledOnce()
  })

  it('TC-041 — đã materialize: KHÔNG tính lại ranking, NHƯNG vẫn đọc lịch sử cho nhãn hiển thị', async () => {
    const deps = makeDeps({
      eligible: [makeDishCard({ dishId: 'a' }), makeDishCard({ dishId: 'b' })],
      materialized: ['b', 'a'],
    })

    const result = await listDeck(deps, BASE_INPUT)

    expect(deps.history.findEatingDates).toHaveBeenCalledOnce()
    expect(deps.materializeDeck).not.toHaveBeenCalled()
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items.map((d) => d.dishId)).toEqual(['b', 'a'])
  })

  it('daysSinceLastEaten gắn đúng vào từng card, kể cả khi đã materialize', async () => {
    const deps = makeDeps({
      eligible: [makeDishCard({ dishId: 'a', globalDishId: 'ga' })],
      materialized: ['a'],
      eatingRows: [{ globalDishId: 'ga', eatingDate: '2026-08-17' }], // referenceDate 2026-08-19 → d=2
    })

    const result = await listDeck(deps, BASE_INPUT)

    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items[0]?.daysSinceLastEaten).toBe(2)
  })

  it('TC-108 — món trong thứ tự đã lưu nhưng KHÔNG còn trong eligible: tự loại bỏ', async () => {
    const deps = makeDeps({
      eligible: [makeDishCard({ dishId: 'a' })], // 'b' đã bị gỡ (INACTIVE), không còn trong eligible
      materialized: ['b', 'a'],
    })

    const result = await listDeck(deps, BASE_INPUT)

    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items.map((d) => d.dishId)).toEqual(['a'])
  })

  it('TC-102 — 0 món ACTIVE: deck rỗng, không lỗi', async () => {
    const deps = makeDeps({ eligible: [] })

    const result = await listDeck(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items).toEqual([])
    expect(result.value.nextCursor).toBeNull()
  })

  it('TC-045 — 30 món, cursor=0, pageSize=20: 20 món, nextCursor=20', async () => {
    const eligible = Array.from({ length: 30 }, (_, i) => makeDishCard({ dishId: `d${i}` }))
    const deps = makeDeps({ eligible, materialized: eligible.map((d) => d.dishId) })

    const result = await listDeck(deps, { ...BASE_INPUT, pageSize: 20 })

    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items).toHaveLength(20)
    expect(result.value.nextCursor).toBe(20)
  })

  it('TC-046 — 30 món, cursor=20, pageSize=20: 10 món còn lại, nextCursor=null', async () => {
    const eligible = Array.from({ length: 30 }, (_, i) => makeDishCard({ dishId: `d${i}` }))
    const deps = makeDeps({ eligible, materialized: eligible.map((d) => d.dishId) })

    const result = await listDeck(deps, { ...BASE_INPUT, cursor: 20, pageSize: 20 })

    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items).toHaveLength(10)
    expect(result.value.nextCursor).toBeNull()
  })

  it('TC-104 — cursor vượt quá tổng số món: 0 item, nextCursor=null, không lỗi', async () => {
    const eligible = [makeDishCard()]
    const deps = makeDeps({ eligible, materialized: ['gd-1'] })

    const result = await listDeck(deps, { ...BASE_INPUT, cursor: 100 })

    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items).toEqual([])
    expect(result.value.nextCursor).toBeNull()
  })

  it('TC-047 — không phải Participant: ERR_NOT_PARTICIPANT (đã có từ E1-T9, test hồi quy)', async () => {
    const deps = makeDeps()
    deps.selection.findParticipant = vi.fn(async () => null)

    const result = await listDeck(deps, BASE_INPUT)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_NOT_PARTICIPANT')
  })

  it('SPEC-011 — Participant REMOVED cũng bị từ chối như chưa từng tham gia', async () => {
    const deps = makeDeps()
    deps.selection.findParticipant = vi.fn(async () => ({ id: 'p-1', state: 'REMOVED' as const }))

    const result = await listDeck(deps, BASE_INPUT)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_NOT_PARTICIPANT')
  })
})
