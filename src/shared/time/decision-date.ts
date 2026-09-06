import { isValidTimeZone } from '@/shared/time/time-zone'

/**
 * SPEC-018 — Decision Date resolution. Nguồn: BR-020, BR-025.
 *
 * Tiện ích thời gian đặt ở `shared/time/` (DEC-068): cả `session`, `meal` và
 * `app/` đều cần quy đổi ngày theo timezone của Group mà không vi phạm ranh
 * giới cross-feature.
 *
 * Hàm thuần: nhận `now` làm tham số chứ không tự gọi `new Date()`. Test vì thế
 * không phải mock `Date`, và đây là điều kiện để TC-004/TC-005 kiểm được ranh
 * giới nửa đêm một cách xác định.
 *
 * Tech Spec §8.2 xếp hàm này vào nhóm sai-mà-không-gây-lỗi: lệch một ngày thì
 * không có gì đỏ, chỉ có uniqueness của Session sai âm thầm.
 */

/** Ngày lịch dạng `YYYY-MM-DD`, đã quy đổi về timezone của Group. */
export type DecisionDate = string

/**
 * Quy đổi một thời điểm UTC sang ngày lịch theo timezone của Group.
 *
 * @param now thời điểm hiện tại, do người gọi truyền vào
 * @param timeZone IANA time zone của Group. Không có giá trị mặc định ẩn —
 *   tạo Group bắt buộc set (SPEC-018).
 * @throws RangeError nếu `timeZone` không phải IANA hợp lệ
 */
export function resolveDecisionDate(now: Date, timeZone: string): DecisionDate {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('resolveDecisionDate: `now` không phải thời điểm hợp lệ')
  }

  // Dùng chung với SPEC-002 để Group không lưu được timezone mà hàm này từ chối.
  if (!isValidTimeZone(timeZone)) {
    throw new RangeError(`resolveDecisionDate: timezone không hợp lệ: "${timeZone}"`)
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const get = (type: Intl.DateTimeFormatPartTypes): string => {
    const part = parts.find((p) => p.type === type)
    if (part === undefined) {
      throw new RangeError(`resolveDecisionDate: thiếu thành phần "${type}"`)
    }
    return part.value
  }

  return `${get('year')}-${get('month')}-${get('day')}`
}
