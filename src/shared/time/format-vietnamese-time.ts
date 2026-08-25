/**
 * "17:42" — giờ chốt bữa ở S-11 và ở thẻ "đã chốt" của S-04.
 *
 * `timeZone` là THAM SỐ BẮT BUỘC, không có mặc định. `finalized_at` là
 * `timestamptz`, nên render nó mà không nói rõ múi giờ sẽ ra giờ của máy chủ
 * Vercel (UTC): một bữa tối chốt lúc 17:42 giờ Việt Nam hiện thành "10:42".
 *
 * Cùng nguyên tắc với `format-vietnamese-date.ts` — người gọi truyền vào bối
 * cảnh, hàm không tự đoán, và test không phải mock gì.
 *
 * KHÔNG dùng `hour12: false` một mình: với locale `vi-VN`, `Intl` có thể trả
 * "24:05" cho nửa đêm. `hourCycle: 'h23'` mới cho đúng "00:05".
 */
export function formatVietnameseTime(instant: Date, timeZone: string): string {
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError('formatVietnameseTime: thời điểm không hợp lệ')
  }

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant)
}
