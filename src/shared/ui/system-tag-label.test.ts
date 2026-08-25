import { describe, expect, it } from 'vitest'

import { SYSTEM_TAGS } from '@/shared/domain/system-tag'

import { ruleShortfallPhrase, SYSTEM_TAG_LABELS, TAG_IN_SENTENCE } from './system-tag-label'

/**
 * Nhãn được GHÉP ở nhiều nơi, nên bản thân nhãn phải tránh đúng những dấu mà
 * chỗ ghép đang dùng. Đây là hợp đồng vô hình giữa hai file — thứ đã hỏng một
 * lần: nhãn `STAPLE` đổi thành "Cơm · Bún · Phở" trong khi hai chỗ ghép vẫn
 * nối bằng ` · `, khiến món hai nhãn đọc thành một chuỗi không tách được.
 *
 * Test này rẻ và bắt đúng lớp lỗi đó ngay khi ai đó thêm nhãn mới.
 */
describe('hợp đồng ghép nhãn', () => {
  it('SYSTEM_TAG_LABELS: không nhãn nào chứa ` + ` — đó là dấu nối GIỮA các nhãn', () => {
    // `add-dish-sheet.tsx` và `finalize-meal-screen.tsx` đều `.join(' + ')`.
    for (const tag of SYSTEM_TAGS) {
      expect(SYSTEM_TAG_LABELS[tag]).not.toContain(' + ')
    }
  })

  it('TAG_IN_SENTENCE: không nhãn nào chứa dấu phẩy — đó là dấu nối của câu "Còn thiếu"', () => {
    // `messages.ts` nối các mảnh thiếu bằng `join(', ')` rồi ` và `.
    for (const tag of SYSTEM_TAGS) {
      expect(TAG_IN_SENTENCE[tag]).not.toContain(',')
    }
  })

  it('cả hai bảng phủ đủ 5 tag', () => {
    for (const tag of SYSTEM_TAGS) {
      expect(SYSTEM_TAG_LABELS[tag]).toBeTruthy()
      expect(TAG_IN_SENTENCE[tag]).toBeTruthy()
    }
  })

  it('STAPLE nói rõ gồm cả bún/phở — BR-003: "Món tinh bột / Cơm, bún"', () => {
    expect(SYSTEM_TAG_LABELS.STAPLE.toLowerCase()).toContain('bún')
    expect(TAG_IN_SENTENCE.STAPLE.toLowerCase()).toContain('bún')
  })

  it('câu "Còn thiếu" ghép nhiều nhãn vẫn đọc được', () => {
    const phrases = [
      ruleShortfallPhrase({ systemTag: 'STAPLE', missing: 1 }),
      ruleShortfallPhrase({ systemTag: 'SOUP', missing: 1 }),
    ]
    expect(`${phrases.slice(0, -1).join(', ')} và ${phrases.at(-1)}`).toBe(
      '1 món cơm/bún và 1 món canh',
    )
  })
})
