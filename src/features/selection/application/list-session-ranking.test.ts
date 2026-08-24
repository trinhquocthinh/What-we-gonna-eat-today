import { describe, expect, it } from 'vitest'

import type { HistoryRepository } from '@/features/history/application/history-repository'

import { listSessionRanking } from './list-session-ranking'
import type { SelectionRepository } from './selection-repository'

function makeFakeSelectionRepository(options: {
  session?: { creatorUserId: string; decisionDate: string } | null
  dishes?: {
    groupDishId: string
    globalDishId: string
    name: string
    proposedCount: number
    rejectedCount: number
  }[]
  participantUserIds?: string[]
  countInteractionsCalls?: string[]
}) {
  const repository: SelectionRepository = {
    async findParticipant(): Promise<never> {
      throw new Error('không dùng')
    },
    async listEligibleDishCards(): Promise<never> {
      throw new Error('không dùng')
    },
    async findSessionState(): Promise<never> {
      throw new Error('không dùng')
    },
    async isDishActiveInSession(): Promise<never> {
      throw new Error('không dùng')
    },
    async applyInteraction(): Promise<never> {
      throw new Error('không dùng')
    },
    async findMaterializedDeck(): Promise<never> {
      throw new Error('không dùng')
    },
    async materializeDeck(): Promise<never> {
      throw new Error('không dùng')
    },
    async findSessionForRanking(_sessionId) {
      return options.session === undefined
        ? { creatorUserId: 'creator-1', decisionDate: '2026-08-20' }
        : options.session
    },
    async countInteractionsByDish(sessionId) {
      options.countInteractionsCalls?.push(sessionId)
      return (
        options.dishes ?? [
          {
            groupDishId: 'gd-1',
            globalDishId: 'g-1',
            name: 'Món 1',
            proposedCount: 3,
            rejectedCount: 0,
          },
          {
            groupDishId: 'gd-2',
            globalDishId: 'g-2',
            name: 'Món 2',
            proposedCount: 0,
            rejectedCount: 0,
          },
        ]
      )
    },
    async listRankingParticipantUserIds() {
      return options.participantUserIds ?? ['u1', 'u2', 'u3', 'u4']
    },
  }

  return repository
}

function makeFakeHistoryRepository(options: {
  recentEatersMap?: Map<string, number>
  countRecentCalls?: unknown[]
}) {
  const repository: HistoryRepository = {
    async findEatingDates(): Promise<never> {
      throw new Error('không dùng trong ranking')
    },
    async countRecentEatersByDish(input) {
      options.countRecentCalls?.push(input)
      return options.recentEatersMap ?? new Map()
    },
  }

  return repository
}

const INPUT = {
  sessionId: 's-1',
  userId: 'creator-1',
  referenceDate: '2026-08-20',
}

describe('listSessionRanking (SPEC-014)', () => {
  it('TC-062: người gọi không phải Creator thì trả ERR_NOT_SESSION_CREATOR và không truy vấn dữ liệu', async () => {
    const countInteractionsCalls: string[] = []
    const selection = makeFakeSelectionRepository({
      session: { creatorUserId: 'other-user', decisionDate: '2026-08-20' },
      countInteractionsCalls,
    })
    const history = makeFakeHistoryRepository({})

    const result = await listSessionRanking({ selection, history }, INPUT)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('ERR_NOT_SESSION_CREATOR')
    }
    expect(countInteractionsCalls).toHaveLength(0)
  })

  it('Session không tồn tại hoặc không ACTIVE trả ERR_SESSION_NOT_ACTIVE', async () => {
    const selection = makeFakeSelectionRepository({ session: null })
    const history = makeFakeHistoryRepository({})

    const result = await listSessionRanking({ selection, history }, INPUT)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('ERR_SESSION_NOT_ACTIVE')
    }
  })

  it('TC-061: món chưa ai vuốt nằm ở untouched, món có vuốt nằm ở ranked', async () => {
    const selection = makeFakeSelectionRepository({
      dishes: [
        {
          groupDishId: 'gd-1',
          globalDishId: 'g-1',
          name: 'Món A',
          proposedCount: 2,
          rejectedCount: 0,
        },
        {
          groupDishId: 'gd-2',
          globalDishId: 'g-2',
          name: 'Món B',
          proposedCount: 0,
          rejectedCount: 0,
        },
      ],
      participantUserIds: ['u1', 'u2'],
    })
    const history = makeFakeHistoryRepository({})

    const result = await listSessionRanking({ selection, history }, INPUT)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.ranked.map((d) => d.dishId)).toEqual(['gd-1'])
      expect(result.value.untouched.map((d) => d.dishId)).toEqual(['gd-2'])
    }
  })

  it('TC-060: chuẩn hoá theo T (5 participant thì điểm chia cho 5)', async () => {
    const selection = makeFakeSelectionRepository({
      dishes: [
        {
          groupDishId: 'gd-1',
          globalDishId: 'g-1',
          name: 'Món A',
          proposedCount: 3,
          rejectedCount: 0,
        },
      ],
      participantUserIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
    })
    const history = makeFakeHistoryRepository({})

    const result = await listSessionRanking({ selection, history }, INPUT)

    expect(result.ok).toBe(true)
    if (result.ok) {
      // P=3, N=0, H=0, T=5 -> 3/5 = 0.6
      expect(result.value.ranked[0]?.score).toBeCloseTo(0.6, 5)
    }
  })

  it('H nối đúng: countRecentEatersByDish trả { g-1 -> 2 } thì món có globalDishId = g-1 nhận recentEaterCount = 2', async () => {
    const selection = makeFakeSelectionRepository({
      dishes: [
        {
          groupDishId: 'gd-1',
          globalDishId: 'g-1',
          name: 'Món A',
          proposedCount: 3,
          rejectedCount: 1,
        },
      ],
      participantUserIds: ['u1', 'u2', 'u3', 'u4'],
    })
    const history = makeFakeHistoryRepository({
      recentEatersMap: new Map([['g-1', 2]]),
    })

    const result = await listSessionRanking({ selection, history }, INPUT)

    expect(result.ok).toBe(true)
    if (result.ok) {
      // T=4, P=3, N=1, H=2 -> (3*1 - 1*0.7 - 2*0.3)/4 = 0.425
      expect(result.value.ranked[0]?.recentEaterCount).toBe(2)
      expect(result.value.ranked[0]?.score).toBeCloseTo(0.425, 3)
    }
  })
})
