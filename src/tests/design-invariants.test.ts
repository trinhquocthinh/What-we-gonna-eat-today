import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Design Criteria §10 — bốn anti-pattern kiểm được bằng máy. Ba cái còn lại
 * (ảnh stock, emoji chibi, đếm ngược, pháo hoa) không có dấu hiệu văn bản đáng
 * tin nên rà bằng mắt, ghi kết luận vào PR.
 *
 * Quét NGUỒN chứ không quét DOM: một anti-pattern không được tồn tại ở BẤT KỲ
 * trạng thái nào, mà test DOM chỉ thấy những trạng thái nó tự dựng ra.
 *
 * Khuôn lấy từ `dish-swipe-card.test.tsx` (E4-S4), nâng từ một component lên
 * toàn dự án.
 */
const SOURCES = globSync('src/**/*.{ts,tsx}').filter((f) => !f.includes('.test.'))

describe('design invariants (§10)', () => {
  it.each([
    ['gradient — §10.1', /bg-gradient|linear-gradient|radial-gradient/],
    ['spinner — §10.8 (dùng Skeleton)', /animate-spin|\bspinner\b/i],
  ])('không file nguồn nào chứa %s', (_label, pattern) => {
    const offenders = SOURCES.filter((file) => pattern.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('chỉ `shared/ui/sheet.tsx` được dùng role="dialog" — §10.7 không modal giữa màn hình', () => {
    const offenders = SOURCES.filter(
      (file) =>
        /role="dialog"/.test(readFileSync(file, 'utf8')) && !file.endsWith('shared/ui/sheet.tsx'),
    )
    expect(offenders).toEqual([])
  })
})
