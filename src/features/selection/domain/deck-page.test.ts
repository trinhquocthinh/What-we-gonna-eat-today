import { describe, expect, it } from 'vitest'

import { capDeck, getDeckPage } from './deck-page'

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

describe('BR-062 — capDeck', () => {
  it('TC-123: 150 phần tử, maxCards = 30 → giữ đúng 30 phần tử đầu', () => {
    const items = Array.from({ length: 150 }, (_, i) => `item-${i}`)
    const capped = capDeck(items, 30)

    expect(capped).toHaveLength(30)
    expect(capped).toEqual(items.slice(0, 30))
  })

  it('TC-124: 12 phần tử, maxCards = 30 → giữ nguyên 12 phần tử, không đệm', () => {
    const items = Array.from({ length: 12 }, (_, i) => `item-${i}`)
    const capped = capDeck(items, 30)

    expect(capped).toHaveLength(12)
    expect(capped).toEqual(items)
  })

  it('0 phần tử → trả mảng rỗng, không ném lỗi', () => {
    expect(capDeck([], 30)).toEqual([])
  })
})
