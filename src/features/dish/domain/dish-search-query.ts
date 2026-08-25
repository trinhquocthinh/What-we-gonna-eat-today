import { MIN_QUERY_LENGTH } from './near-match'
import { normalizeDishName } from './normalize-name'

/**
 * Chuẩn bị chuỗi người dùng gõ để tra `global_dishes.normalized_name`.
 *
 * Trả `null` nghĩa là "chưa đủ để tra" — người gọi hiện danh sách rỗng, KHÔNG
 * phải báo lỗi: gõ dở một chữ không phải là sai.
 *
 * BẮT BUỘC đi qua `normalizeDishName` — bất biến "đừng tạo hàm chuẩn hoá thứ
 * hai" của `normalize-name.ts`. Nhờ đó gõ `bun cha` cũng ra `Bún chả`.
 *
 * Lọc `%`, `_`, `\` là chuyện AN TOÀN, không phải làm sạch cho đẹp: câu tra
 * dùng `LIKE '%' || q || '%'`, nên một dấu `%` người dùng gõ vào sẽ khớp toàn
 * bộ catalog. Bỏ hẳn ba ký tự đó đơn giản hơn `ESCAPE`, và một tên món tiếng
 * Việt thì không chứa chúng.
 */
export function readDishSearchQuery(raw: string): string | null {
  const needle = normalizeDishName(raw).replace(/[%_\\]/g, '')

  return needle.length < MIN_QUERY_LENGTH ? null : needle
}
