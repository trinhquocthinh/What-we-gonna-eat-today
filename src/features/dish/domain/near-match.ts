import { normalizeDishName } from './normalize-name'

/** Cổng độ dài của mockup (`nd.length > 2`): gõ "cá" chưa đủ để bới cả danh
 *  mục lên. Đếm trên chuỗi ĐÃ chuẩn hoá, đúng như mockup.
 *
 *  Export vì tra catalog chung (`dish-search-query.ts`) dùng CHUNG ngưỡng này:
 *  hai ô gợi ý nằm cạnh nhau mà bật ở hai độ dài khác nhau thì trông như lỗi. */
export const MIN_QUERY_LENGTH = 3

/** Mockup `.slice(0, 3)`. Thiết kế chỉ chừa chỗ cho ba thẻ. */
const MAX_CANDIDATES = 3

export type NearMatchInput = {
  readonly id: string
  readonly name: string
}

/**
 * Tìm món "gần giống" trong danh sách của CHÍNH NHÓM, đúng vị từ của mockup
 * (`S-05 S-06 Danh muc mon.dc.html:188-193`): bằng nhau, hoặc chuỗi này chứa
 * chuỗi kia — theo CẢ HAI chiều.
 *
 * BR-001 gọi đây là "các món có khả năng trùng HOẶC TƯƠNG TỰ". Nó KHÁC với
 * `findGlobalCandidatesByNormalizedName` của S2 (khớp chính xác, phạm vi toàn
 * cục) — hai thứ phục vụ hai mục đích, xem §2.2 của guide này.
 *
 * BẮT BUỘC đi qua `normalizeDishName`, không tự viết `toLowerCase().includes()`:
 * `normalize-name.ts` ghi rõ bất biến "đừng tạo hàm chuẩn hoá thứ hai". Nhờ đó
 * sau E2-T3 thì tìm gần giống tự khắc bỏ dấu — gõ `ca kho` ra `Cá kho`, miễn
 * phí, không thêm một dòng nào.
 */
export function findNearMatches<T extends NearMatchInput>(
  dishes: readonly T[],
  draft: string,
): T[] {
  const needle = normalizeDishName(draft)

  if (needle.length < MIN_QUERY_LENGTH) {
    return []
  }

  return dishes
    .filter((dish) => {
      const name = normalizeDishName(dish.name)
      return name === needle || name.includes(needle) || needle.includes(name)
    })
    .slice(0, MAX_CANDIDATES)
}
