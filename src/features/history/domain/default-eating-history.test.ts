import { describe, expect, it } from 'vitest'

import { buildDefaultEatingHistory } from './default-eating-history'

describe('SPEC-017 — Sinh Default Eating History (domain)', () => {
  it('TC-076: Final Meal 3 Dish và 4 Participant thì tạo đúng 12 record', () => {
    const rows = buildDefaultEatingHistory({
      participantUserIds: ['u1', 'u2', 'u3', 'u4'],
      globalDishIds: ['d1', 'd2', 'd3'],
      decisionDate: '2026-08-14',
      finalMealId: 'meal-1',
    })

    expect(rows).toHaveLength(12)
  })

  it('TC-078: eating_date khớp đúng decision_date được truyền vào, không phụ thuộc giờ UTC', () => {
    const rows = buildDefaultEatingHistory({
      participantUserIds: ['u1'],
      globalDishIds: ['d1'],
      decisionDate: '2026-08-14',
      finalMealId: 'meal-1',
    })

    expect(rows[0]?.eatingDate).toBe('2026-08-14')
  })

  it('SPEC-017: mỗi record giữ đúng source_final_meal_id truyền vào', () => {
    const rows = buildDefaultEatingHistory({
      participantUserIds: ['u1'],
      globalDishIds: ['d1'],
      decisionDate: '2026-08-14',
      finalMealId: 'meal-xyz',
    })

    expect(rows[0]?.sourceFinalMealId).toBe('meal-xyz')
  })

  it('không có Participant hoặc không có Dish thì trả mảng rỗng', () => {
    expect(
      buildDefaultEatingHistory({
        participantUserIds: [],
        globalDishIds: ['d1'],
        decisionDate: '2026-08-14',
        finalMealId: 'meal-1',
      }),
    ).toEqual([])
  })
})
