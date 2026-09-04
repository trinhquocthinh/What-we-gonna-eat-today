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
   * SPEC-024 — tập món MỘT user không ăn được. Trả `Set` chứ không mảng: người
   * gọi chỉ hỏi "có hay không".
   */
  findConstrainedGlobalDishIds(userId: string): Promise<ReadonlySet<string>>

  /**
   * BR-056 / M3-T9 — cặp `(user, món)` có khai `Cannot Eat`, cho `finalizeSession`.
   *
   * MỘT truy vấn cho CẢ nhóm, không phải `findConstrainedGlobalDishIds` gọi N
   * lần cho N người: đó là lối viết mà E7-S3 Guide §4.2 đã cấm bằng chữ khi
   * dựng `countCannotEatByDish`, và đường chốt bữa còn nhạy hơn đường xếp hạng.
   *
   * Khoá là `${userId}:${globalDishId}` — CẶP, không phải một trong hai: người
   * B không ăn được cá vẫn được ghi là đã ăn canh trong cùng bữa đó. Cặp không
   * có mặt nghĩa là không khai; người gọi dùng `.has()`.
   */
  findCannotEatPairs(
    userIds: readonly string[],
    globalDishIds: readonly string[],
  ): Promise<ReadonlySet<string>>

  /**
   * SPEC-025 — $E$ theo món, cho Stage 2. Món không có dòng KHÔNG có mặt
   * trong Map; người gọi dùng `?? null`. Cùng khuôn `countRecentEatersByDish`.
   */
  findPreferencesByGlobalDish(
    userId: string,
    globalDishIds: readonly string[],
  ): Promise<Map<string, PreferenceKind>>
}
