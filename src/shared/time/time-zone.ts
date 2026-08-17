/**
 * Timezone dùng chung cho SPEC-002 (nơi ghi) và SPEC-018 (nơi đọc).
 *
 * Đặt ở `shared/` chứ không trong feature nào: `group` không import được
 * `session` (ESLint chặn cross-feature), mà hai nơi PHẢI hiểu "timezone hợp lệ"
 * giống hệt nhau. Lệch nhau nghĩa là Group lưu được một giá trị mà
 * `resolveDecisionDate` sau đó ném lỗi — một quả mìn chỉ nổ khi ai đó mở phiên.
 */

/** Chỉ để HIỂN THỊ khi chưa có Group context (ví dụ caption ngày ở /groups).
 *  TUYỆT ĐỐI không dùng làm timezone của Group hay để tính Decision Date:
 *  SPEC-018 nói rõ "không có giá trị mặc định ẩn". */
export const DISPLAY_TIME_ZONE_FALLBACK = 'Asia/Ho_Chi_Minh'

// Intl chấp nhận cả dạng offset ('+07:00', '-0500') — đã kiểm. Nhưng SPEC-002
// yêu cầu IANA identifier, nên chặn riêng dạng này.
const OFFSET_LIKE = /^[+-]?\d/

/**
 * KHÔNG hiện thực bằng `Intl.supportedValuesOf('timeZone').includes(tz)`.
 * Danh sách đó đã canonical hoá và KHÔNG chứa 'Asia/Ho_Chi_Minh' (đã kiểm trên
 * ICU 77 lẫn 78) — dùng nó sẽ từ chối chính timezone của TC-004/TC-005.
 */
export function isValidTimeZone(timeZone: string): boolean {
  const value = timeZone.trim()
  if (value === '' || OFFSET_LIKE.test(value)) {
    return false
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

/** Dạng chuẩn theo ICU: 'Asia/Ho_Chi_Minh' → 'Asia/Saigon'. `null` nếu không hợp lệ.
 *  Luôn canonical hoá trước khi ghi DB, nếu không thì mỗi trình duyệt lưu một
 *  chuỗi khác nhau cho cùng một múi giờ. */
export function canonicalTimeZone(timeZone: string): string | null {
  if (!isValidTimeZone(timeZone)) {
    return null
  }
  return new Intl.DateTimeFormat('en-US', { timeZone: timeZone.trim() }).resolvedOptions().timeZone
}

function readTimeZoneName(
  timeZone: string,
  now: Date,
  locale: string,
  style: 'shortGeneric' | 'shortOffset',
): string {
  const parts = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: style }).formatToParts(
    now,
  )
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone
}

const VIETNAMESE_TIME_PREFIX = 'Giờ '

/**
 * 'Asia/Saigon' → 'Việt Nam · GMT+7'. Đã kiểm trên cả 418 zone: 323 zone cho
 * chuỗi dạng 'Giờ …', 95 zone cho viết tắt kiểu 'ET' — nhánh else lấy tên
 * thành phố từ chính chuỗi IANA. Không có bảng hardcode nào ở đây.
 */
export function formatTimeZoneLabel(timeZone: string, now: Date): string {
  const canonical = canonicalTimeZone(timeZone)
  if (canonical === null) {
    return timeZone
  }

  const generic = readTimeZoneName(canonical, now, 'vi-VN', 'shortGeneric')
  const offset = readTimeZoneName(canonical, now, 'en-US', 'shortOffset')

  const name = generic.startsWith(VIETNAMESE_TIME_PREFIX)
    ? generic.slice(VIETNAMESE_TIME_PREFIX.length)
    : (canonical.split('/').at(-1) ?? canonical).replaceAll('_', ' ')

  return `${name} · ${offset}`
}
