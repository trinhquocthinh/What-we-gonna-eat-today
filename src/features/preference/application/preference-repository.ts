import type { ConstraintKind, PreferenceKind } from '../domain/explicit-preference'

/**
 * Port cho E7 (SPEC-024, SPEC-025).
 * Hiện thực tầng infrastructure được cung cấp ở E7-S2.
 */
export interface PreferenceRepository {
  /**
   * BR-034 / BR-035 / BR-036 — bật/tắt MỘT trong ba cờ cá nhân.
   *
   * `removedInteraction` chỉ có thể `true` ở đúng một nhánh:
   * `kind === 'CANNOT_EAT' && enabled`. Người gọi cần biết để quyết định thông
   * điệp (E7-S3).
   *
   * Blacklist **KHÔNG** xoá lượt vuốt đang có — đây là điểm khác duy nhất giữa
   * `BR-035` và `BR-034`, và cũng là toàn bộ lý do hai luật tách nhau.
   * `Cannot Eat` nói *"tôi không ăn được"*, một sự thật về cơ thể, nên $P$ phải
   * sửa lại cho đúng. Blacklist nói *"đừng gợi ý nữa"*, một sở thích, và nó
   * không làm cho lượt vuốt hôm nay thành sai. `TC-166` canh đúng chỗ này.
   */
  setConstraint(input: {
    userId: string
    globalDishId: string
    kind: ConstraintKind
    enabled: boolean
  }): Promise<{ removedInteraction: boolean }>

  /**
   * SPEC-040 — ghi MỘT mốc thời gian, KHÔNG xoá dòng nào. `SPEC-037` bỏ qua mọi
   * phiên có `decision_date` trước mốc.
   *
   * Xoá thật sẽ phá Session Ranking của các phiên cũ (`SPEC-014` đọc cùng bảng
   * `interactions`) và vi phạm `BR-061` — tương tác cũ phải được bảo toàn kể cả
   * khi không còn được tính. `TC-171` đếm số dòng để ghim điều đó.
   *
   * Mốc do **Postgres** sinh (`now()`), không phải `new Date()` ở tầng ứng
   * dụng: nó được đọ với `decision_date` trong `findImplicitSwipes` (DEC-070),
   * nên phải cùng một đồng hồ với dữ liệu nó lọc.
   */
  resetImplicitPreference(userId: string): Promise<{ implicitResetAt: string }>

  /** Mốc quên hiện tại, cho màn cài đặt cá nhân. `null` = chưa bấm bao giờ. */
  findImplicitResetAt(userId: string): Promise<string | null>

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
