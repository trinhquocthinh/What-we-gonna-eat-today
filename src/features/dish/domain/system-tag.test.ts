import { describe, expect, it } from 'vitest'

import { isSystemTag, readSystemTags, SYSTEM_TAGS, toSystemTags } from './system-tag'

describe('readSystemTags', () => {
  it('TC-100 — đủ 5 giá trị khác nhau đều hợp lệ', () => {
    const result = readSystemTags(['DESSERT', 'MAIN', 'STAPLE', 'SOUP', 'SIDE'])

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    // Trả về theo THỨ TỰ CHUẨN, không theo thứ tự gửi lên.
    expect(result.value).toEqual(['STAPLE', 'MAIN', 'SIDE', 'SOUP', 'DESSERT'])
  })

  it('TC-101 — giá trị lặp lại bị khử trùng trước khi lưu', () => {
    const result = readSystemTags(['MAIN', 'MAIN', 'SOUP', 'MAIN'])

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual(['MAIN', 'SOUP'])
  })

  it('TC-021 — giá trị ngoài enum bị từ chối', () => {
    const result = readSystemTags(['BREAKFAST'])

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error).toBe('INVALID_SYSTEM_TAG')
  })

  it('TC-021 — một giá trị lạ lẫn giữa các giá trị hợp lệ vẫn bị từ chối', () => {
    expect(readSystemTags(['MAIN', 'BREAKFAST', 'SOUP']).ok).toBe(false)
  })

  it('TC-023 — mảng rỗng là hợp lệ', () => {
    const result = readSystemTags([])

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value).toEqual([])
  })
})

describe('toSystemTags', () => {
  it('bỏ qua giá trị lạ thay vì ném', () => {
    expect(toSystemTags(['MAIN', 'BREAKFAST'])).toEqual(['MAIN'])
  })

  it('chuẩn hoá về thứ tự chuẩn', () => {
    expect(toSystemTags(['SOUP', 'STAPLE'])).toEqual(['STAPLE', 'SOUP'])
  })
})

describe('isSystemTag', () => {
  it('đúng cho cả 5 giá trị', () => {
    for (const tag of SYSTEM_TAGS) {
      expect(isSystemTag(tag)).toBe(true)
    }
  })

  it('sai cho chữ thường — DB enum là UPPER_SNAKE (SDD dòng 86)', () => {
    expect(isSystemTag('main')).toBe(false)
  })
})
