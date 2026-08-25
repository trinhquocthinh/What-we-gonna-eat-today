import { describe, expect, it } from 'vitest'

import { getDeckPage } from './deck-page'

function makeThirtyItems(): number[] {
  return Array.from({ length: 30 }, (_, i) => i)
}

describe('SPEC-011 — Lấy trang deck', () => {
  it('TC-045: deck 30 món, cursor=0 thì trả 20 món và nextCursor=20', () => {
    const page = getDeckPage(makeThirtyItems(), 0, 20)
    expect(page.items).toHaveLength(20)
    expect(page.nextCursor).toBe(20)
  })

  it('TC-046: cursor=20 thì trả 10 món và nextCursor=null', () => {
    const page = getDeckPage(makeThirtyItems(), 20, 20)
    expect(page.items).toHaveLength(10)
    expect(page.nextCursor).toBeNull()
  })

  it('SPEC-011: pageSize lớn hơn tổng số món thì trả hết một lần, nextCursor=null', () => {
    const page = getDeckPage(makeThirtyItems(), 0, 100)
    expect(page.items).toHaveLength(30)
    expect(page.nextCursor).toBeNull()
  })
})
