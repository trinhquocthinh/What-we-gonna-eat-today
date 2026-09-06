import { describe, expect, it, vi } from 'vitest'

import type { HistoryRepository } from '@/features/history/application/history-repository'
import type {
  ConstraintKind,
  PreferenceKind,
} from '@/features/preference/domain/explicit-preference'
import type { PreferenceRepository } from '@/features/preference/application/preference-repository'
import type { SystemTag } from '@/shared/domain/system-tag'

import type { ImplicitSwipe } from '../domain/implicit-preference'
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
    lane: 'EXPLOIT',
    ...overrides,
  }
}

function makeDeps(
  overrides: {
    eligible?: DishCard[]
    materialized?: readonly string[] | null
    eatingRows?: { globalDishId: string; eatingDate: string }[]
    preferencesMap?: Map<string, PreferenceKind>
    sessionCourses?: {
      deckMode: 'FREE' | 'COURSE'
      courses: readonly SystemTag[]
    }
    implicitSwipes?: ImplicitSwipe[]
    whitelisted?: Set<string>
  } = {},
) {
  const materializeDeck = vi.fn(async () => ({ outcome: 'MATERIALIZED' as const }))
  const findImplicitSwipes = vi.fn(async () => overrides.implicitSwipes ?? [])
  const selection: Partial<SelectionRepository> = {
    findParticipant: vi.fn(async () => ({ id: 'p-1', state: 'ACTIVE' as const })),
    listEligibleDishCards: vi.fn(async () => overrides.eligible ?? [makeDishCard()]),
    findMaterializedDeck: vi.fn(async () => overrides.materialized ?? null),
    materializeDeck,
    findSessionCourses: vi.fn(
      async () => overrides.sessionCourses ?? { deckMode: 'FREE' as const, courses: [] },
    ),
    findImplicitSwipes,
  }
  const history: HistoryRepository = {
    findEatingDates: vi.fn(async () => overrides.eatingRows ?? []),
    countRecentEatersByDish: vi.fn(async () => new Map()),
    findEatingHistory: vi.fn(async () => []),
  }
  const findConstrainedGlobalDishIds = vi.fn(
    async (_userId: string, kind: ConstraintKind): Promise<ReadonlySet<string>> =>
      kind === 'HISTORY_WHITELIST' ? (overrides.whitelisted ?? new Set()) : new Set(),
  )
  const preferences: PreferenceRepository = {
    setConstraint: vi.fn(async () => ({ removedInteraction: false })),
    resetImplicitPreference: vi.fn(async () => ({ implicitResetAt: '2026-09-06T00:00:00.000Z' })),
    findImplicitResetAt: vi.fn(async () => null),
    setPreference: vi.fn(async () => undefined),
    findConstrainedGlobalDishIds,
    findCannotEatPairs: vi.fn(async () => new Set<string>()),
    findPreferencesByGlobalDish: vi.fn(async () => overrides.preferencesMap ?? new Map()),
  }
  return {
    selection: selection as SelectionRepository,
    history,
    preferences,
    materializeDeck,
    findImplicitSwipes,
    findConstrainedGlobalDishIds,
  }
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

  it('TC-119 — món DISLIKE vẫn nằm trong deck nhưng bị xếp sau món LIKE', async () => {
    const dishLike = makeDishCard({ dishId: 'd-like', globalDishId: 'g-like', name: 'Món Thích' })
    const dishDislike = makeDishCard({
      dishId: 'd-dislike',
      globalDishId: 'g-dislike',
      name: 'Món Ghét',
    })
    const preferencesMap = new Map<string, PreferenceKind>([
      ['g-like', 'LIKE'],
      ['g-dislike', 'DISLIKE'],
    ])

    const deps = makeDeps({
      eligible: [dishDislike, dishLike],
      preferencesMap,
    })

    const result = await listDeck(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items).toHaveLength(2)
    // Món LIKE phải đứng trước món DISLIKE
    expect(result.value.items[0]?.dishId).toBe('d-like')
    expect(result.value.items[1]?.dishId).toBe('d-dislike')
  })

  it('gán đúng cờ lane (EXPLORE vs EXPLOIT) ở mỗi lần đọc', async () => {
    const dishExplore1 = makeDishCard({ dishId: 'd-never', globalDishId: 'g-never' }) // d = null -> EXPLORE
    const dishExplore2 = makeDishCard({ dishId: 'd-old', globalDishId: 'g-old' }) // d = 35 -> EXPLORE
    const dishExploit = makeDishCard({ dishId: 'd-recent', globalDishId: 'g-recent' }) // d = 5 -> EXPLOIT
    const dishDislike = makeDishCard({ dishId: 'd-dislike', globalDishId: 'g-dislike' }) // d = null nhưng DISLIKE -> EXPLOIT

    const deps = makeDeps({
      eligible: [dishExplore1, dishExplore2, dishExploit, dishDislike],
      materialized: ['d-never', 'd-old', 'd-recent', 'd-dislike'],
      eatingRows: [
        { globalDishId: 'g-old', eatingDate: '2026-07-15' }, // d = 35 (referenceDate 2026-08-19)
        { globalDishId: 'g-recent', eatingDate: '2026-08-14' }, // d = 5
      ],
      preferencesMap: new Map([['g-dislike', 'DISLIKE']]),
    })

    const result = await listDeck(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    const byId = new Map(result.value.items.map((d) => [d.dishId, d]))
    expect(byId.get('d-never')?.lane).toBe('EXPLORE')
    expect(byId.get('d-old')?.lane).toBe('EXPLORE')
    expect(byId.get('d-recent')?.lane).toBe('EXPLOIT')
    expect(byId.get('d-dislike')?.lane).toBe('EXPLOIT')
  })

  it('E8-T4 — BR-048: đổi Like/Dislike giữa phiên không thay đổi thứ tự deck đã materialize', async () => {
    // Session đã materialize thứ tự ['d1', 'd2']
    const d1 = makeDishCard({ dishId: 'd1', globalDishId: 'g1' })
    const d2 = makeDishCard({ dishId: 'd2', globalDishId: 'g2' })

    // User đổi Like d2 và Dislike d1 giữa phiên
    const deps = makeDeps({
      eligible: [d1, d2],
      materialized: ['d1', 'd2'],
      preferencesMap: new Map([
        ['g1', 'DISLIKE'],
        ['g2', 'LIKE'],
      ]),
    })

    const result = await listDeck(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    // Thứ tự vẫn giữ nguyên ['d1', 'd2'] vì đã materialize
    expect(result.value.items.map((d) => d.dishId)).toEqual(['d1', 'd2'])
  })

  it('TC-126 — 150 món: materialize deck đúng 30 thẻ với trộn 4+1', async () => {
    const eligible = Array.from({ length: 150 }, (_, i) =>
      makeDishCard({ dishId: `d-${i}`, globalDishId: `g-${i}` }),
    )
    const deps = makeDeps({ eligible })

    const result = await listDeck(deps, { ...BASE_INPUT, pageSize: 30 })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(deps.materializeDeck).toHaveBeenCalledOnce()
    const materializedArg = (
      deps.materializeDeck.mock.calls[0] as unknown as [string, string, string[]]
    )[2]
    expect(materializedArg).toHaveLength(30)
    // Không có id nào lặp lại
    expect(new Set(materializedArg).size).toBe(30)
  })

  it('COURSE mode: chia đúng các chặng và blend explore trong từng chặng', async () => {
    const stapleDishes = Array.from({ length: 15 }, (_, i) =>
      makeDishCard({ dishId: `s-${i}`, globalDishId: `gs-${i}`, systemTags: ['STAPLE'] }),
    )
    const mainDishes = Array.from({ length: 15 }, (_, i) =>
      makeDishCard({ dishId: `m-${i}`, globalDishId: `gm-${i}`, systemTags: ['MAIN'] }),
    )
    const soupDishes = Array.from({ length: 15 }, (_, i) =>
      makeDishCard({ dishId: `so-${i}`, globalDishId: `gso-${i}`, systemTags: ['SOUP'] }),
    )

    const deps = makeDeps({
      eligible: [...stapleDishes, ...mainDishes, ...soupDishes],
      sessionCourses: {
        deckMode: 'COURSE',
        courses: ['STAPLE', 'MAIN', 'SOUP'],
      },
    })

    const result = await listDeck(deps, { ...BASE_INPUT, pageSize: 30 })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(deps.materializeDeck).toHaveBeenCalledOnce()
    const materializedArg = (
      deps.materializeDeck.mock.calls[0] as unknown as [string, string, string[]]
    )[2]
    expect(materializedArg).toHaveLength(30)
    // 10 STAPLE đầu, 10 MAIN kế tiếp, 10 SOUP cuối
    expect(materializedArg.slice(0, 10).every((id) => id.startsWith('s-'))).toBe(true)
    expect(materializedArg.slice(10, 20).every((id) => id.startsWith('m-'))).toBe(true)
    expect(materializedArg.slice(20, 30).every((id) => id.startsWith('so-'))).toBe(true)
  })

  it('TC-137: FREE mode -> courses === null; items y hệt trước E9', async () => {
    const deps = makeDeps({
      eligible: [makeDishCard({ dishId: 'd1' }), makeDishCard({ dishId: 'd2' })],
      sessionCourses: { deckMode: 'FREE', courses: [] },
    })

    const result = await listDeck(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.courses).toBeNull()
    expect(result.value.items).toHaveLength(2)
  })

  it('COURSE mode 3 chặng -> courses 3 phần tử, tổng count = items.length', async () => {
    const staple = [makeDishCard({ dishId: 's1', systemTags: ['STAPLE'] })]
    const main = [
      makeDishCard({ dishId: 'm1', systemTags: ['MAIN'] }),
      makeDishCard({ dishId: 'm2', systemTags: ['MAIN'] }),
    ]
    const soup = [makeDishCard({ dishId: 'so1', systemTags: ['SOUP'] })]

    const deps = makeDeps({
      eligible: [...staple, ...main, ...soup],
      sessionCourses: {
        deckMode: 'COURSE',
        courses: ['STAPLE', 'MAIN', 'SOUP'],
      },
    })

    const result = await listDeck(deps, { ...BASE_INPUT, pageSize: 10 })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.courses).toEqual([
      { systemTag: 'STAPLE', count: 1 },
      { systemTag: 'MAIN', count: 2 },
      { systemTag: 'SOUP', count: 1 },
    ])
    const totalCount = result.value.courses?.reduce((acc, c) => acc + c.count, 0)
    expect(totalCount).toBe(result.value.items.length)
  })

  it('món bị Cannot Eat giữa phiên: count của chặng chứa nó giảm 1, chặng khác không đổi', async () => {
    // Giả lập session đã materialize 4 món: s1, m1, m2, so1
    const staple = makeDishCard({ dishId: 's1', systemTags: ['STAPLE'] })
    const main1 = makeDishCard({ dishId: 'm1', systemTags: ['MAIN'] })
    const soup = makeDishCard({ dishId: 'so1', systemTags: ['SOUP'] })

    // m2 bị Cannot Eat nên không còn trong eligible (không có trong mảng eligible truyền vào)
    const deps = makeDeps({
      eligible: [staple, main1, soup],
      materialized: ['s1', 'm1', 'm2', 'so1'],
      sessionCourses: {
        deckMode: 'COURSE',
        courses: ['STAPLE', 'MAIN', 'SOUP'],
      },
    })

    const result = await listDeck(deps, { ...BASE_INPUT, pageSize: 10 })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    // main giảm từ 2 xuống 1, staple và soup vẫn 1
    expect(result.value.courses).toEqual([
      { systemTag: 'STAPLE', count: 1 },
      { systemTag: 'MAIN', count: 1 },
      { systemTag: 'SOUP', count: 1 },
    ])
    expect(result.value.items.map((d) => d.dishId)).toEqual(['s1', 'm1', 'so1'])
  })

  // M3-T4 — thứ tự deck đông cứng trong `session_decks`, tag thì không.
  it('Admin gỡ nhãn một món giữa phiên: tổng ranh giới vẫn bằng số thẻ, không món nào mất chặng', async () => {
    const staple = makeDishCard({ dishId: 's1', systemTags: ['STAPLE'] })
    // s2 vốn là STAPLE lúc materialize; Admin vừa gỡ sạch nhãn của nó.
    const retagged = makeDishCard({ dishId: 's2', systemTags: [] })
    const main1 = makeDishCard({ dishId: 'm1', systemTags: ['MAIN'] })
    const soup = makeDishCard({ dishId: 'so1', systemTags: ['SOUP'] })

    const deps = makeDeps({
      eligible: [staple, retagged, main1, soup],
      materialized: ['s1', 's2', 'm1', 'so1'],
      sessionCourses: {
        deckMode: 'COURSE',
        courses: ['STAPLE', 'MAIN', 'SOUP'],
      },
    })

    const result = await listDeck(deps, { ...BASE_INPUT, pageSize: 10 })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')

    const total = result.value.courses?.reduce((acc, c) => acc + c.count, 0)
    expect(total).toBe(result.value.items.length)
    expect(result.value.courses).toEqual([
      { systemTag: 'STAPLE', count: 2 },
      { systemTag: 'MAIN', count: 1 },
      { systemTag: 'SOUP', count: 1 },
    ])
  })
})

describe('listDeck — E13-T5: số hạng I và History Whitelist', () => {
  it('món có lịch sử vuốt phải xếp trên món không có, khi mọi thứ khác bằng nhau', async () => {
    const quiet = makeDishCard({ dishId: 'gd-quiet', globalDishId: 'gld-quiet' })
    const loved = makeDishCard({ dishId: 'gd-loved', globalDishId: 'gld-loved' })

    const deps = makeDeps({
      eligible: [quiet, loved],
      implicitSwipes: [
        { globalDishId: 'gld-loved', type: 'SWIPE_RIGHT', decisionDate: BASE_INPUT.referenceDate },
        { globalDishId: 'gld-loved', type: 'SWIPE_RIGHT', decisionDate: BASE_INPUT.referenceDate },
      ],
    })

    const result = await listDeck(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items.map((d) => d.dishId)).toEqual(['gd-loved', 'gd-quiet'])
  })

  it('lịch sử vuốt TRÁI đẩy món xuống — I âm là một tín hiệu thật, không phải 0', async () => {
    const neutral = makeDishCard({ dishId: 'gd-neutral', globalDishId: 'gld-neutral' })
    const rejected = makeDishCard({ dishId: 'gd-rejected', globalDishId: 'gld-rejected' })

    const deps = makeDeps({
      eligible: [rejected, neutral],
      implicitSwipes: [
        {
          globalDishId: 'gld-rejected',
          type: 'SWIPE_LEFT',
          decisionDate: BASE_INPUT.referenceDate,
        },
        {
          globalDishId: 'gld-rejected',
          type: 'SWIPE_LEFT',
          decisionDate: BASE_INPUT.referenceDate,
        },
      ],
    })

    const result = await listDeck(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items.map((d) => d.dishId)).toEqual(['gd-neutral', 'gd-rejected'])
  })

  it('TC-169 — món trong Whitelist ăn hôm qua: R ép về 0, không bị Cooldown đẩy xuống', async () => {
    const whitelistedDish = makeDishCard({ dishId: 'gd-pho', globalDishId: 'gld-pho' })
    const other = makeDishCard({ dishId: 'gd-bun', globalDishId: 'gld-bun' })

    // Cả hai đều ăn hôm qua ($R = 0.857$), nhưng chỉ `gld-pho` được gỡ phạt.
    const eatingRows = [
      { globalDishId: 'gld-pho', eatingDate: '2026-08-18' },
      { globalDishId: 'gld-bun', eatingDate: '2026-08-18' },
    ]

    const deps = makeDeps({
      eligible: [other, whitelistedDish],
      eatingRows,
      whitelisted: new Set(['gld-pho']),
    })

    const result = await listDeck(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items.map((d) => d.dishId)).toEqual(['gd-pho', 'gd-bun'])
  })

  it('E13-S1 Guide §1.1 — món Whitelist VẪN CÓ trong deck, Whitelist không phải phép lọc', async () => {
    // Ca không có mã TC trong đặc tả. Nó canh lỗi im lặng nguy hiểm nhất của
    // epic: nếu mệnh đề `kind` ở Stage 1 bị bỏ sót, một dòng HISTORY_WHITELIST
    // cũng làm `notExists` trả false và món biến khỏi deck — đúng ngược BR-036.
    const whitelistedDish = makeDishCard({ dishId: 'gd-pho', globalDishId: 'gld-pho' })

    const deps = makeDeps({
      eligible: [whitelistedDish],
      whitelisted: new Set(['gld-pho']),
    })

    const result = await listDeck(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.items.map((d) => d.dishId)).toEqual(['gd-pho'])
    // Và `list-deck` phải hỏi ĐÚNG loại cờ — hỏi nhầm `CANNOT_EAT` thì tập
    // Whitelist luôn rỗng và ba ca trên xanh vì lý do sai.
    expect(deps.findConstrainedGlobalDishIds).toHaveBeenCalledWith('u1', 'HISTORY_WHITELIST')
  })

  it('TC-170 — Whitelist và Like trực giao: E = +1 vẫn cộng, R = 0 vẫn gỡ phạt', async () => {
    const both = makeDishCard({ dishId: 'gd-both', globalDishId: 'gld-both' })
    const likedOnly = makeDishCard({ dishId: 'gd-liked', globalDishId: 'gld-liked' })

    const deps = makeDeps({
      eligible: [likedOnly, both],
      eatingRows: [
        { globalDishId: 'gld-both', eatingDate: '2026-08-18' },
        { globalDishId: 'gld-liked', eatingDate: '2026-08-18' },
      ],
      preferencesMap: new Map([
        ['gld-both', 'LIKE' as const],
        ['gld-liked', 'LIKE' as const],
      ]),
      whitelisted: new Set(['gld-both']),
    })

    const result = await listDeck(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    // Hai hiệu ứng cộng dồn: cùng E = +1, món được gỡ phạt Cooldown xếp trước.
    expect(result.value.items.map((d) => d.dishId)).toEqual(['gd-both', 'gd-liked'])
  })

  it('BR-048 — deck đã materialize KHÔNG đọc I: hai truy vấn nhịp 2 không chạy', async () => {
    // TC-172 ở tầng use case. Bấm Quên giữa phiên không đổi thứ tự deck đang
    // chạy, và cũng không tốn thêm truy vấn nào trên đường lật trang.
    const deps = makeDeps({
      eligible: [makeDishCard({ dishId: 'gd-1' })],
      materialized: ['gd-1'],
    })

    const result = await listDeck(deps, BASE_INPUT)

    expect(result.ok).toBe(true)
    expect(deps.findImplicitSwipes).not.toHaveBeenCalled()
    expect(deps.findConstrainedGlobalDishIds).not.toHaveBeenCalled()
  })
})
