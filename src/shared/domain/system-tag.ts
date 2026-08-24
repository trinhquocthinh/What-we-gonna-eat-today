/**
 * SDD §2.2 — `SystemTag = STAPLE | MAIN | SIDE | SOUP | DESSERT` (BR-003).
 *
 * Ở `shared/` chứ không ở `features/dish/` vì BA feature đọc nó: `dish` (gán
 * tag), `rule` (đặt chỉ tiêu theo tag), `meal` (đối chiếu lúc chốt). Bảng
 * `ALLOWED_CROSS_FEATURE` của `eslint.config.mjs` không cho `rule → dish` hay
 * `meal → dish`, và nới bảng đó chỉ để lấy một union 5 phần tử là đổi hợp đồng
 * kiến trúc để tránh một lần chuyển file — xem DEC-040.
 *
 * Bản sao DB của union này là `pgEnum('system_tag')` trong
 * `src/shared/db/schema.ts`. Sửa một bên thì sửa cả hai; hai chỗ đó gặp nhau
 * duy nhất ở tầng `infrastructure/`.
 */
export type SystemTag = 'STAPLE' | 'MAIN' | 'SIDE' | 'SOUP' | 'DESSERT'

/**
 * Thứ tự CHUẨN của bữa cơm Việt: Cơm → Món mặn → Món phụ → Canh → Tráng miệng.
 * Là thứ tự của MÂM CƠM, không phải quyết định thẩm mỹ — mọi nơi đọc tag đều
 * chuẩn hoá về nó để so sánh được bằng `toEqual`. Nhãn tiếng Việt thuộc
 * presentation (`system-tag-label.ts`).
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
