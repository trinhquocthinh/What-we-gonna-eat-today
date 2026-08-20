import { describe, expect, it } from 'vitest'

import { describeParticipantRow } from './participant-status'

function makeProgress(overrides: Partial<Parameters<typeof describeParticipantRow>[0]> = {}) {
  return {
    userId: 'u1',
    displayName: 'Mẹ',
    state: 'ACTIVE' as const,
    proposedCount: 0,
    totalInteractions: 0,
    ...overrides,
  }
}

describe('describeParticipantRow', () => {
  it('COMPLETED: "Xong · N món"', () => {
    expect(
      describeParticipantRow(makeProgress({ state: 'COMPLETED', proposedCount: 6 }), false),
    ).toBe('Xong · 6 món')
  })

  it('chính mình, chưa xong: luôn "Chưa xong" bất kể đã tương tác bao nhiêu', () => {
    expect(describeParticipantRow(makeProgress({ totalInteractions: 3 }), true)).toBe('Chưa xong')
  })

  it('người khác, đã có tương tác, chưa xong: "Đang chọn"', () => {
    expect(describeParticipantRow(makeProgress({ totalInteractions: 2 }), false)).toBe('Đang chọn')
  })

  it('người khác, chưa tương tác nào: "Chưa mở"', () => {
    expect(describeParticipantRow(makeProgress({ totalInteractions: 0 }), false)).toBe('Chưa mở')
  })
})
