/**
 * BR-037 — Explicit Preference. `null` = Neutral (không có dòng trong
 * `user_dish_preferences`), KHÔNG phải một giá trị enum thứ ba (Guide §1.2).
 */
export type PreferenceKind = 'LIKE' | 'DISLIKE'

/** $E \in \{-1, 0, +1\}$ của Ranking Spec §2.2. */
export function explicitPreferenceScore(kind: PreferenceKind | null): number {
  if (kind === 'LIKE') return 1
  if (kind === 'DISLIKE') return -1
  return 0
}
