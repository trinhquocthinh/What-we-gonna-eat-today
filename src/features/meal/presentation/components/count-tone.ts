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
    // E6-T6: đổi từ `text-ink-faint` (2.91:1 — TRƯỢT chuẩn 4.5:1 của Design
    // Criteria §8) sang `text-ink-muted` (5.64:1). "Số 0 hiện mờ chứ không ẩn"
    // của E5-T7 vẫn đúng — `--ink-muted` vẫn nhạt hơn hẳn `--ink` và `--yes`,
    // chỉ là đọc được. "0 không muốn" là thông tin, và là tin tốt; hiện nó ở
    // 2.91:1 là ẩn nó bằng cách khác.
    return 'text-ink-muted'
  }
  return tone === 'yes' ? 'text-yes font-medium' : 'text-ink'
}
