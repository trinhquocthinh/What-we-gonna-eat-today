import type { SessionState } from './session'

/**
 * Vì sao một phiên không mở để vuốt nữa. `null` = vẫn mở.
 *
 * `EXPIRED` tách khỏi `INVALID` có chủ ý: `INVALID` là trạng thái đã ghi vào DB
 * (quét lười ở Group Hub, `SPEC-034`), còn `EXPIRED` là phiên CHƯA được quét —
 * vẫn mang `ACTIVE` trong DB nhưng ngày quyết định đã trôi qua. Với người dùng
 * hai thứ là một; với người đọc mã thì không, và nhầm chúng là quên mất rằng
 * quét lười chỉ chạy khi có người mở Group Hub.
 */
export type SessionClosedReason = 'NOT_STARTED' | 'EXPIRED' | 'FINALIZED' | 'INVALID'

/**
 * M3-T10 / `BR-055` — phiên này còn vuốt được không.
 *
 * Hàm thuần, nhận `today` làm tham số chứ không tự gọi `new Date()`: cùng kỷ
 * luật đã áp cho `resolveDecisionDate` và `computeRecencyPenalty`, và là điều
 * kiện để test kiểm được ranh giới nửa đêm một cách xác định.
 *
 * `decisionDate` và `today` đều là `YYYY-MM-DD` đã quy về timezone của Group,
 * nên so sánh chuỗi là so sánh ngày.
 */
export function sessionClosedReason(input: {
  readonly state: SessionState
  readonly decisionDate: string
  readonly today: string
}): SessionClosedReason | null {
  if (input.state === 'DRAFT') return 'NOT_STARTED'
  if (input.state === 'FINALIZED') return 'FINALIZED'
  if (input.state === 'INVALID') return 'INVALID'
  if (input.decisionDate < input.today) return 'EXPIRED'
  return null
}
