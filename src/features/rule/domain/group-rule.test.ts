import { describe, expect, it } from 'vitest'
import { readGroupRules } from './group-rule'

describe('readGroupRules', () => {
  // TC-085 — Admin đặt `REQUIRED SOUP >= 1`.
  it('nhận một rule hợp lệ', () => {
    const result = readGroupRules([{ systemTag: 'SOUP', minimumCount: 1 }])

    expect(result).toEqual({ ok: true, value: [{ systemTag: 'SOUP', minimumCount: 1 }] })
  })

  // TC-088 — lưu danh sách rỗng để gỡ hết quy định.
  it('nhận danh sách rỗng', () => {
    expect(readGroupRules([])).toEqual({ ok: true, value: [] })
  })

  // TC-086.
  it('từ chối minimumCount = 0', () => {
    const result = readGroupRules([{ systemTag: 'MAIN', minimumCount: 0 }])

    expect(result).toEqual({ ok: false, error: 'INVALID_MINIMUM_COUNT' })
  })

  it('từ chối minimumCount không nguyên', () => {
    const result = readGroupRules([{ systemTag: 'MAIN', minimumCount: 1.5 }])

    expect(result).toEqual({ ok: false, error: 'INVALID_MINIMUM_COUNT' })
  })

  // TC-087 — hai rule cùng tag.
  it('từ chối hai rule trùng System Tag', () => {
    const result = readGroupRules([
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'MAIN', minimumCount: 2 },
    ])

    expect(result).toEqual({ ok: false, error: 'DUPLICATE_RULE' })
  })

  it('từ chối System Tag lạ', () => {
    const result = readGroupRules([{ systemTag: 'DRINK', minimumCount: 1 }])

    expect(result).toEqual({ ok: false, error: 'INVALID_SYSTEM_TAG' })
  })

  // Thứ tự kiểm cố định — input sai cả hai chỗ vẫn ra INVALID_MINIMUM_COUNT.
  it('báo minimumCount trước khi báo trùng lặp', () => {
    const result = readGroupRules([
      { systemTag: 'MAIN', minimumCount: 1 },
      { systemTag: 'MAIN', minimumCount: 0 },
    ])

    expect(result).toEqual({ ok: false, error: 'INVALID_MINIMUM_COUNT' })
  })

  it('giữ nguyên thứ tự người dùng gửi lên', () => {
    const result = readGroupRules([
      { systemTag: 'SOUP', minimumCount: 1 },
      { systemTag: 'MAIN', minimumCount: 2 },
    ])

    expect(result.ok && result.value.map((r) => r.systemTag)).toEqual(['SOUP', 'MAIN'])
  })
})
