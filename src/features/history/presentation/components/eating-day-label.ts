import { formatVietnameseDateShort } from '@/shared/time/format-vietnamese-date'

/* jscpd:ignore-start */
function computeYesterday(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) {
    throw new RangeError(`computeYesterday: ngày không hợp lệ: "${isoDate}"`)
  }
  const dateUtc = new Date(Date.UTC(y, m - 1, d))
  dateUtc.setUTCDate(dateUtc.getUTCDate() - 1)
  const yyyy = dateUtc.getUTCFullYear()
  const mm = String(dateUtc.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dateUtc.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
/* jscpd:ignore-end */

/**
 * "Hôm qua · Thứ Hai 15/8" cho ngày liền trước, "Chủ Nhật 14/8" cho các ngày
 * còn lại, "Hôm nay · …" cho chính hôm nay.
 *
 * Nhận `today` làm THAM SỐ. Ở presentation nên có thể đọc `new Date()`, nhưng
 * không: `today` ở đây là Decision Date theo timezone Group, không phải ngày
 * của trình duyệt. Một người mở app lúc 0h30 giờ Nhật vẫn phải thấy "Hôm nay"
 * theo lịch của nhà mình.
 */
export function eatingDayLabel(eatingDate: string, today: string): string {
  const shortFormatted = formatVietnameseDateShort(eatingDate)

  if (eatingDate === today) {
    return `Hôm nay · ${shortFormatted}`
  }

  if (eatingDate === computeYesterday(today)) {
    return `Hôm qua · ${shortFormatted}`
  }

  return shortFormatted
}
