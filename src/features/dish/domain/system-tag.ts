import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { SYSTEM_TAGS, isSystemTag, type SystemTag } from '@/shared/domain/system-tag'

// Giữ đường import cũ còn hiệu lực cho 12 chỗ trong `features/dish/**` —
// chuyển nhà một kiểu dữ liệu không đáng làm bẩn 12 file diff.
export { SYSTEM_TAGS, isSystemTag }
export type { SystemTag }

export type SystemTagError = 'INVALID_SYSTEM_TAG'

/**
 * NGHIÊM — dùng cho dữ liệu KHÔNG tin được (FormData, body request).
 * Một giá trị lạ là `ERR_INVALID_SYSTEM_TAG` (TC-021), không im lặng bỏ qua.
 *
 * Khử trùng lặp (TC-101) và trả về theo THỨ TỰ CHUẨN, không theo thứ tự người
 * dùng gửi lên — nhờ vậy `toEqual([...])` trong test là xác định, và khoá chính
 * ghép `(group_dish_id, system_tag)` không bao giờ bị chèn trùng trong cùng một
 * batch.
 *
 * Không cần kiểm "tối đa 5": chỉ có đúng 5 giá trị hợp lệ, nên sau khi khử
 * trùng lặp thì độ dài tự khắc ≤ 5. TC-100 pass mà không cần luật riêng.
 */
export function readSystemTags(values: readonly string[]): Result<SystemTag[], SystemTagError> {
  const seen = new Set<string>()

  for (const value of values) {
    if (!isSystemTag(value)) {
      return err('INVALID_SYSTEM_TAG')
    }
    seen.add(value)
  }

  return ok(SYSTEM_TAGS.filter((tag) => seen.has(tag)))
}

/**
 * KHOAN DUNG — dùng cho dữ liệu ĐỌC TỪ DB, nơi `json_agg` trả về `string[]`
 * mà TypeScript không kiểm được (xem §10.3). Bỏ qua giá trị lạ thay vì ném:
 * một hàng hỏng không được làm sập cả trang danh mục món.
 */
export function toSystemTags(values: readonly string[]): SystemTag[] {
  const seen = new Set(values)
  return SYSTEM_TAGS.filter((tag) => seen.has(tag))
}
