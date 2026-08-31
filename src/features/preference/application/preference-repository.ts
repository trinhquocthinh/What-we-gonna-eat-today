import type { PreferenceKind } from '../domain/explicit-preference'

/**
 * Port cho E7 (SPEC-024, SPEC-025).
 * Hiện thực tầng infrastructure được cung cấp ở E7-S2.
 */
export interface PreferenceRepository {
  /**
   * BR-034. Bật/tắt ràng buộc. Trả `true` nếu có một lượt vuốt bị xoá kèm
   * theo — người gọi cần biết để quyết định thông điệp (S3).
   */
  setConstraint(input: {
    userId: string
    globalDishId: string
    cannotEat: boolean
  }): Promise<{ removedInteraction: boolean }>

  /** BR-037. `kind: null` = xoá dòng, KHÔNG ghi 'NEUTRAL' (S1 §1.2, TC-120). */
  setPreference(input: {
    userId: string
    globalDishId: string
    kind: PreferenceKind | null
  }): Promise<void>

  /**
   * SPEC-024 — tập món user không ăn được, để `list-deck` và `finalizeSession`
   * dùng. Trả `Set` chứ không mảng: cả hai người gọi đều chỉ hỏi "có hay không".
   */
  findConstrainedGlobalDishIds(userId: string): Promise<ReadonlySet<string>>

  /**
   * SPEC-025 — $E$ theo món, cho Stage 2. Món không có dòng KHÔNG có mặt
   * trong Map; người gọi dùng `?? null`. Cùng khuôn `countRecentEatersByDish`.
   */
  findPreferencesByGlobalDish(
    userId: string,
    globalDishIds: readonly string[],
  ): Promise<Map<string, PreferenceKind>>
}
