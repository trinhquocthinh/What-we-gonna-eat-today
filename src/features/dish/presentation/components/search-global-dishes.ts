/**
 * Một gợi ý từ catalog chung.
 *
 * `id` là `global_dishes.id` — CÙNG không gian id với ứng viên `kind: 'global'`
 * của `duplicate-sheet.tsx`, và khác `group_dishes.id`. Trộn hai thứ này là lỗi
 * khoá ngoại mà DEC-032 sinh ra để ngăn.
 */
export type CatalogSuggestion = {
  readonly id: string
  readonly name: string
}

/**
 * Gọi SPEC-023. Tự khai kiểu phản hồi thay vì dùng chung DTO với route — đúng
 * khuôn `send-interaction.ts`: hai bên nói chuyện qua JSON, không qua kiểu.
 *
 * KHÔNG retry: lần thử lại của một ô gợi ý chính là phím tiếp theo người dùng
 * gõ. Mọi thất bại đều trả danh sách rỗng — gợi ý là tiện ích, hỏng thì im
 * lặng biến mất chứ không được chặn người ta thêm món.
 */
export async function searchGlobalDishes(
  groupId: string,
  query: string,
  signal: AbortSignal,
): Promise<CatalogSuggestion[]> {
  try {
    const response = await fetch(
      `/api/groups/${groupId}/dishes/search?q=${encodeURIComponent(query)}`,
      { signal },
    )

    if (!response.ok) return []

    const body: unknown = await response.json()
    const suggestions =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)['suggestions']
        : undefined

    return Array.isArray(suggestions) ? (suggestions as CatalogSuggestion[]) : []
  } catch {
    // Gồm cả `AbortError` khi người dùng gõ tiếp — đúng đường đi mong đợi,
    // không phải sự cố.
    return []
  }
}
