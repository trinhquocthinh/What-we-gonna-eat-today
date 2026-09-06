/**
 * E13-T7 — dòng chữ tóm tắt trạng thái khai báo của MỘT món.
 *
 * Tách khỏi component vì hình dạng bài toán đổi ở E13. Trước đó ba trạng thái
 * loại trừ nhau về mặt hiển thị, nên một chuỗi `? :` lồng nhau là đủ. Ba cờ mới
 * thì ĐỘC LẬP — một người vừa khai "không ăn được", vừa Blacklist, vừa
 * Whitelist cùng một món là hợp lệ (`TC-168` khẳng định ở tầng dữ liệu). Nối
 * thêm hai tầng `? :` nữa sẽ chỉ hiện MỘT cờ và giấu hai cờ kia, tức là màn
 * hình nói dối về trạng thái thật.
 *
 * Ở đây nó cũng nằm trong phạm vi đo coverage, thay vì trốn trong một biểu thức
 * JSX — cùng khuôn `system-tag-label.ts`, `dish-explanation.ts`,
 * `participant-status.ts`.
 *
 * `NFR-03` / E6-T6: đây là tín hiệu dành cho MẮT THƯỜNG. Màu và `aria-pressed`
 * là hai kênh còn lại, không kênh nào được là kênh duy nhất.
 */

/** Khai lại tại chỗ, cùng lý lẽ `DishPreferenceKind` — xem `dish-preference-controls.tsx`. */
export type DishConstraintKind = 'CANNOT_EAT' | 'BLACKLIST' | 'HISTORY_WHITELIST'

export type DishPreferenceKind = 'LIKE' | 'DISLIKE'

export type ConstraintFlags = Readonly<Record<DishConstraintKind, boolean>>

/**
 * Thứ tự CỐ ĐỊNH, không theo thứ tự bấm: một dòng chữ đổi thứ tự giữa hai lần
 * render là một dòng chữ khó đọc.
 *
 * Hệ quả nặng trước (lọc cứng khỏi deck), rồi tới thứ chỉ gỡ phạt, rồi tới sở
 * thích — cùng thứ tự mà Stage 1 và Stage 2 của Ranking Spec đọc chúng.
 */
const CONSTRAINT_LABELS: readonly (readonly [DishConstraintKind, string])[] = [
  ['CANNOT_EAT', 'Không ăn được'],
  ['BLACKLIST', 'Đã tắt gợi ý'],
  ['HISTORY_WHITELIST', 'Ăn hoài không chán'],
]

export function constraintStatusText(input: {
  readonly preference: DishPreferenceKind | null
  readonly flags: ConstraintFlags
}): string {
  const parts: string[] = []

  for (const [kind, label] of CONSTRAINT_LABELS) {
    if (input.flags[kind]) {
      parts.push(label)
    }
  }

  if (input.preference === 'LIKE') {
    parts.push('Đang thích')
  } else if (input.preference === 'DISLIKE') {
    parts.push('Đang không thích')
  }

  return parts.join(' · ')
}
