export type EatingRecord = {
  readonly eatingDate: string
  readonly dishName: string
}

export type EatingDay = {
  readonly eatingDate: string
  readonly dishNames: readonly string[]
}

/**
 * SPEC-017 phía đọc — gom bản ghi phẳng thành từng ngày, ngày mới nhất trước.
 *
 * Hàm thuần, không chạm DB, không biết hôm nay là ngày nào. Nhãn tương đối
 * ("Hôm qua · Thứ Hai 15/8") là việc của presentation (§10.1) — nó phụ thuộc
 * "hôm nay", mà "hôm nay" phụ thuộc timezone của Group, thứ `domain/` của
 * `history` không được biết.
 *
 * Khử trùng lặp tên món trong cùng một ngày: BR-046 Multi-source Collapse —
 * cùng một User ăn cùng một món trong cùng một ngày từ hai nguồn vẫn là MỘT
 * lần ăn. Ở v1.0 chưa có nguồn thứ hai, nhưng luật đã đúng và rẻ.
 */
export function groupEatingHistory(records: readonly EatingRecord[]): EatingDay[] {
  const byDate = new Map<string, Set<string>>()

  for (const record of records) {
    const names = byDate.get(record.eatingDate)
    if (names === undefined) {
      byDate.set(record.eatingDate, new Set([record.dishName]))
    } else {
      names.add(record.dishName)
    }
  }

  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([eatingDate, names]) => ({
      eatingDate,
      dishNames: [...names].sort((a, b) => a.localeCompare(b, 'vi')),
    }))
}
