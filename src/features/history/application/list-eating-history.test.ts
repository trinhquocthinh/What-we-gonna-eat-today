import { describe, expect, it, vi } from 'vitest'

import type { HistoryRepository } from './history-repository'
import { listEatingHistory } from './list-eating-history'

describe('listEatingHistory', () => {
  it('truy vấn lịch sử trong 30 ngày và gom kết quả theo ngày', async () => {
    const mockFindEatingHistory = vi.fn().mockResolvedValue([
      { eatingDate: '2026-08-16', dishName: 'Cơm chiên' },
      { eatingDate: '2026-08-15', dishName: 'Phở bò' },
    ])

    const historyRepo: HistoryRepository = {
      findEatingDates: vi.fn(),
      countRecentEatersByDish: vi.fn(),
      findEatingHistory: mockFindEatingHistory,
    }

    const result = await listEatingHistory(
      { history: historyRepo },
      { userId: 'user-1', today: '2026-08-16' },
    )

    expect(mockFindEatingHistory).toHaveBeenCalledWith({
      userId: 'user-1',
      from: '2026-07-17',
      to: '2026-08-16',
    })

    expect(result).toEqual([
      { eatingDate: '2026-08-16', dishNames: ['Cơm chiên'] },
      { eatingDate: '2026-08-15', dishNames: ['Phở bò'] },
    ])
  })
})
