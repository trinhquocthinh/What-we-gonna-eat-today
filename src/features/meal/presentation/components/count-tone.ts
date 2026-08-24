/**
 * E5-T7 DoD: "số 0 hiện MỜ chứ không ẩn".
 *
 * Ẩn số 0 làm các ô nhảy chỗ giữa các thẻ và mắt đọc lướt mất mốc neo. Mà
 * "0 không muốn" còn là TIN TỐT — ẩn nó đi là giấu đúng thứ người dùng cần
 * thấy nhất (Guide §1.3).
 *
 * Một hàm thay vì rải `value === 0 ? …` khắp JSX: quy tắc này là DoD, nên phải
 * có một chỗ để test khẳng định nó.
 *
 * KHÔNG dùng màu đỏ cho "không muốn" — cùng ràng buộc Design Criteria đã áp
 * cho vuốt trái ở E4-T7. Người không muốn ăn món này không phải đang báo lỗi.
 */
export function countTone(value: number, tone: 'yes' | 'neutral'): string {
  if (value === 0) {
    return 'text-ink-faint'
  }
  return tone === 'yes' ? 'text-yes font-medium' : 'text-ink'
}
