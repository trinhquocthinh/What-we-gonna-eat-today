/**
 * SPEC-011 — Lấy trang deck. Hàm thuần, không chạm DB: slicing một mảng đã có
 * sẵn trong bộ nhớ (Tech Spec §3.3 — "không phân trang ở tầng DB... phân
 * trang trong bộ nhớ"). Generic vì đây thuần là logic cắt trang, không quan
 * tâm hình dạng phần tử.
 */
export type DeckPage<T> = {
  readonly items: readonly T[]
  readonly nextCursor: number | null
}

export function getDeckPage<T>(items: readonly T[], cursor: number, pageSize: number): DeckPage<T> {
  const page = items.slice(cursor, cursor + pageSize)
  const nextCursor = cursor + pageSize < items.length ? cursor + pageSize : null
  return { items: page, nextCursor }
}
