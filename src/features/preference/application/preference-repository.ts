import type { ConstraintKind, PreferenceKind } from '../domain/explicit-preference'

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
   * SPEC-024 / SPEC-038 / SPEC-039 — tập món MỘT user đã gắn MỘT loại cờ. Trả
   * `Set` chứ không mảng: người gọi chỉ hỏi "có hay không".
   *
   * `kind` là tham số BẮT BUỘC, và đó là chủ đích. SDD §10 yêu cầu mọi truy vấn
   * đọc `user_dish_constraints` phải nêu rõ `kind`; một tham số bắt buộc là
   * phiên bản có trình biên dịch của yêu cầu đó, còn một lời nhắc trong tài
   * liệu thì không. Bỏ sót một chỗ nghĩa là Blacklist lặng lẽ mang theo hành vi
   * của Cannot Eat, hoặc món Whitelist bị lọc khỏi deck.
   */
  findConstrainedGlobalDishIds(userId: string, kind: ConstraintKind): Promise<ReadonlySet<string>>

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
