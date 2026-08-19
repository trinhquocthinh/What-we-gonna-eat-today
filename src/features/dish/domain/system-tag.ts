import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

/**
 * SDD §2.2 — `SystemTag = STAPLE | MAIN | SIDE | SOUP | DESSERT` (BR-003).
 *
 * Bản sao của enum `system_tag` trong `src/shared/db/schema.ts`, cùng lý do và
 * cùng ràng buộc như `group-dish.ts`: `domain/` không được import drizzle, nên
 * hai chỗ chỉ gặp nhau ở `infrastructure/drizzle-dish-repository.ts`. Sửa một
 * bên thì sửa cả hai.
 */
export type SystemTag = 'STAPLE' | 'MAIN' | 'SIDE' | 'SOUP' | 'DESSERT'

/**
 * Thứ tự CHUẨN của bữa cơm Việt, lấy từ mockup S-05/S-06
 * (`designs/S-05 S-06 Danh muc mon.dc.html:164`): Cơm → Món mặn → Món phụ →
 * Canh → Tráng miệng.
 *
 * Đặt ở `domain/` chứ không phải `presentation/` vì đây là thứ tự của MÂM CƠM,
 * không phải quyết định thẩm mỹ: E2-T6 nhóm danh sách món theo đúng thứ tự này,
 * và mọi chỗ đọc tag đều chuẩn hoá về nó để so sánh được bằng `toEqual`.
 * Nhãn tiếng Việt thì thuộc presentation — xem `system-tag-label.ts`.
 */
export const SYSTEM_TAGS = [
  'STAPLE',
  'MAIN',
  'SIDE',
  'SOUP',
  'DESSERT',
] as const satisfies readonly SystemTag[]

export function isSystemTag(value: string): value is SystemTag {
  return (SYSTEM_TAGS as readonly string[]).includes(value)
}

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
