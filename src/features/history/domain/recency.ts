/**
 * SPEC-020 — Recency Penalty. Hàm thuần: không đọc DB, không tự biết "hôm
 * nay" là ngày nào. Mọi thứ đi vào qua tham số, đúng DoD của E4-T1.
 *
 * Nhận MẢNG ngày chứ không phải một ngày duy nhất — đó là điều làm `TC-084`
 * có ý nghĩa. BR-046 "Multi-source Collapse": cùng một người ăn cùng một món
 * ở hai Group khác nhau trong cùng một ngày chỉ tính LÀ MỘT lần ăn. Lấy ngày
 * lớn nhất là collapse theo cấu trúc — không cần đếm, không cần khử trùng
 * lặp riêng.
 *
 * `cooldownWindowDays` là tham số chứ không phải hằng số cục bộ: hằng số đó
 * thuộc `RANKING_CONFIG` bên `features/selection`, mà `history` KHÔNG được
 * import `selection` (`eslint.config.mjs` → `ALLOWED_CROSS_FEATURE`). Xem
 * Implementation Guide §1.3.
 */

/** Ngày lịch dạng `YYYY-MM-DD`, đã quy đổi sang timezone của Group từ trước. */
type CalendarDate = string

function toUtcMidnight(date: CalendarDate): number {
  const parsed = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`recency: ngày không hợp lệ: "${date}"`)
  }
  return parsed.getTime()
}

const MS_PER_DAY = 86_400_000

/**
 * Số ngày LỊCH kể từ lần ăn gần nhất. `null` = chưa từng ăn ($d = \infty$ theo
 * cách nói của Ranking Spec §2.5) — `buildDeck` cần phân biệt để tie-break,
 * nên đây là hàm export riêng chứ không phải biến cục bộ.
 *
 * Parse ở UTC midnight (cùng khuôn `formatVietnameseDate` đã có): hai mốc đều
 * là nửa đêm UTC nên hiệu luôn là bội số nguyên của một ngày — không lệch do
 * DST, không lệch qua ranh giới tháng hay năm nhuận.
 */
export function daysSinceLastEaten(input: {
  readonly eatingDates: readonly CalendarDate[]
  readonly referenceDate: CalendarDate
}): number | null {
  if (input.eatingDates.length === 0) {
    return null
  }

  // Chuỗi `YYYY-MM-DD` so sánh từ điển TRÙNG với so sánh thời gian — không
  // cần parse để tìm max.
  let latest = input.eatingDates[0] as CalendarDate
  for (const date of input.eatingDates) {
    if (date > latest) {
      latest = date
    }
  }

  const diffMs = toUtcMidnight(input.referenceDate) - toUtcMidnight(latest)
  return Math.round(diffMs / MS_PER_DAY)
}

/**
 * $R = \max\left(0, 1 - \frac{d}{\text{window}}\right)$, chặn trên tại 1.
 *
 * SPEC-020 ghi đầu ra là $R \in [0, 1]$ nhưng công thức chỉ có `max(0, …)`.
 * Nếu `eatingDates` chứa ngày MUỘN HƠN `referenceDate` thì $d$ âm và
 * $1 - d/7 > 1$ — phá vỡ đúng cái hợp đồng SPEC-020 tự tuyên bố. Không có TC
 * nào cho ca này và nó không nên xảy ra trong dữ liệu thật (lịch sử ăn sinh
 * từ Session đã FINALIZED, luôn ở quá khứ hoặc hôm nay), nhưng chặn trên là
 * một phép `Math.min` — rẻ hơn nhiều so với việc đi tìm một điểm số > 1 lọt
 * vào `buildDeck` rồi tự hỏi vì sao thứ tự deck vô lý.
 */
export function computeRecencyPenalty(input: {
  readonly eatingDates: readonly CalendarDate[]
  readonly referenceDate: CalendarDate
  readonly cooldownWindowDays: number
}): number {
  const d = daysSinceLastEaten(input)
  if (d === null) {
    return 0
  }

  return Math.min(1, Math.max(0, 1 - d / input.cooldownWindowDays))
}
