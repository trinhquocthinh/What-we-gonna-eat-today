/**
 * Toán học của cử chỉ vuốt — hàm thuần, KHÔNG đụng DOM, KHÔNG đụng React. Tách
 * riêng vì jsdom không hiện thực `setPointerCapture` (§1.1): mọi logic ĐÁNG
 * test của cử chỉ phải nằm ở đây để test được mà không cần giả lập pointer
 * event nào.
 *
 * Giá trị lấy nguyên từ thiết kế S-09 (`S-09 Deck vuot prototype.dc.html`):
 * ngưỡng đổi màu preview 40px, ngưỡng commit 90px, góc xoay tối đa 8°.
 */

const PREVIEW_THRESHOLD_PX = 40
const COMMIT_THRESHOLD_PX = 90
const MAX_ROTATION_DEG = 8
const ROTATION_DIVISOR = 18
const FLY_OUT_DISTANCE_PX = 460

export type SwipeDirection = -1 | 0 | 1

/** Hướng để ĐỔI MÀU/HIỆN NHÃN lúc đang kéo — ngưỡng 40px, chưa phải commit. */
export function resolvePreviewDirection(dx: number): SwipeDirection {
  if (dx > PREVIEW_THRESHOLD_PX) return 1
  if (dx < -PREVIEW_THRESHOLD_PX) return -1
  return 0
}

/** Có nên COMMIT hành động khi nhả tay không — ngưỡng 90px, tuyệt đối theo px. */
export function shouldCommitOnRelease(dx: number): SwipeDirection {
  if (dx > COMMIT_THRESHOLD_PX) return 1
  if (dx < -COMMIT_THRESHOLD_PX) return -1
  return 0
}

/** `translateX(dx) rotate(clamp(-8, dx/18, 8)deg)` — góc xoay theo dx lúc đang kéo. */
export function computeDragRotationDeg(dx: number): number {
  return Math.max(-MAX_ROTATION_DEG, Math.min(MAX_ROTATION_DEG, dx / ROTATION_DIVISOR))
}

/** Vị trí ngang của thẻ khi đang bay ra sau khi commit — dir * 460px. */
export function computeFlyOutTranslateX(direction: SwipeDirection): number {
  return direction * FLY_OUT_DISTANCE_PX
}
