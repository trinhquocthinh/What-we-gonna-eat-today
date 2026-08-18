/**
 * Caption ngày ở header S-02 và S-04: 'Thứ Ba · 18 tháng 8'.
 *
 * Nhận chuỗi ngày lịch chứ KHÔNG nhận `Date`: người gọi đã quy đổi sang
 * timezone của Group bằng `resolveDecisionDate` rồi, nên ở đây không còn
 * timezone nào len vào được và test không phải mock gì.
 */
export function formatVietnameseDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`formatVietnameseDate: ngày không hợp lệ: "${isoDate}"`)
  }

  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).formatToParts(date)

  const read = (type: Intl.DateTimeFormatPartTypes): string => {
    const part = parts.find((candidate) => candidate.type === type)
    if (part === undefined) {
      throw new RangeError(`formatVietnameseDate: thiếu thành phần "${type}"`)
    }
    return part.value
  }

  return `${read('weekday')} · ${read('day')} ${read('month')}`
}

/**
 * Header S-09: "Thứ Ba 16/8" — khác `formatVietnameseDate` ("Thứ Ba · 18
 * tháng 8", dùng ở S-02/S-04). Hai định dạng cho hai ngữ cảnh khác nhau, KHÔNG
 * hợp nhất — header compact của màn hình vuốt cần ngắn nhất có thể.
 */
export function formatVietnameseDateShort(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`formatVietnameseDateShort: ngày không hợp lệ: "${isoDate}"`)
  }

  const weekday = new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', weekday: 'long' }).format(
    date,
  )
  const day = new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', day: 'numeric' }).format(date)
  const month = new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', month: 'numeric' }).format(date)

  return `${weekday} ${day}/${month}`
}
