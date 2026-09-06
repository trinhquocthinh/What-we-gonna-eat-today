import { describe, expect, it } from 'vitest'

import { explicitPreferenceScore } from './explicit-preference'

describe('explicitPreferenceScore', () => {
  it('TC-118 — LIKE → +1, không đặt → 0, DISLIKE → -1', () => {
    expect(explicitPreferenceScore('LIKE')).toBe(1)
    expect(explicitPreferenceScore(null)).toBe(0)
    expect(explicitPreferenceScore('DISLIKE')).toBe(-1)
  })
})
