/**
 * BR-037 — Explicit Preference. `null` = Neutral (không có dòng trong
 * `user_dish_preferences`), KHÔNG phải một giá trị enum thứ ba (Guide §1.2).
 */
export type PreferenceKind = 'LIKE' | 'DISLIKE'

/**
 * SDD §10 — ba cờ cá nhân dùng chung bảng `user_dish_constraints`, khác nhau ở
 * HỆ QUẢ chứ không ở cách lưu:
 *
 * - `CANNOT_EAT` (BR-034) — lọc cứng khỏi deck, XOÁ lượt vuốt đang có, trừ $X$.
 * - `BLACKLIST` (BR-035) — lọc cứng khỏi deck, KHÔNG xoá lượt vuốt, KHÔNG trừ $X$.
 * - `HISTORY_WHITELIST` (BR-036) — không lọc, không cộng điểm, chỉ ép $R = 0$.
 *
 * Nằm ở `domain/` cạnh `PreferenceKind` vì nó là từ vựng nghiệp vụ, không phải
 * chi tiết lưu trữ — cùng chỗ và cùng lý lẽ.
 */
export type ConstraintKind = 'CANNOT_EAT' | 'BLACKLIST' | 'HISTORY_WHITELIST'

/** $E \in \{-1, 0, +1\}$ của Ranking Spec §2.2. */
export function explicitPreferenceScore(kind: PreferenceKind | null): number {
  if (kind === 'LIKE') return 1
  if (kind === 'DISLIKE') return -1
  return 0
}
