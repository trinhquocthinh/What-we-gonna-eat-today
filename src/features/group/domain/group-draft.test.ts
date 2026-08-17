import { describe, expect, it } from 'vitest'

import { readGroupDraft } from './group-draft'

const VALID_TIMEZONE = 'Asia/Ho_Chi_Minh'

describe('readGroupDraft', () => {
  it('cắt khoảng trắng thừa ở tên', () => {
    const result = readGroupDraft({ name: '  Nhà Bảy Hiền  ', timezone: VALID_TIMEZONE })
    expect(result.ok && result.value.name).toBe('Nhà Bảy Hiền')
  })

  it('lưu timezone ở dạng canonical', () => {
    const result = readGroupDraft({ name: 'Nhà Bảy Hiền', timezone: 'Asia/Ho_Chi_Minh' })
    expect(result.ok && result.value.timezone).toBe('Asia/Saigon')
  })

  it('TC-010: tên toàn khoảng trắng thì NAME_EMPTY', () => {
    const result = readGroupDraft({ name: '   ', timezone: VALID_TIMEZONE })
    expect(result.ok === false && result.error).toBe('NAME_EMPTY')
  })

  it('TC-009: timezone sai thì TIMEZONE_INVALID', () => {
    const result = readGroupDraft({ name: 'Nhà Bảy Hiền', timezone: 'Asia/Saigon_typo' })
    expect(result.ok === false && result.error).toBe('TIMEZONE_INVALID')
  })

  it('60 ký tự thì được, 61 thì không — đếm theo code point', () => {
    expect(readGroupDraft({ name: 'à'.repeat(60), timezone: VALID_TIMEZONE }).ok).toBe(true)
    const tooLong = readGroupDraft({ name: 'à'.repeat(61), timezone: VALID_TIMEZONE })
    expect(tooLong.ok === false && tooLong.error).toBe('NAME_TOO_LONG')
  })
})
