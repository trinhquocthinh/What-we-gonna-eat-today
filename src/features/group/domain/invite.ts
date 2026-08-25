/**
 * SPEC-004 / TC-112 — biên ĐÓNG: token hết hạn ĐÚNG lúc `expiresAt` vẫn tính
 * là hết hạn (`now >= expiresAt`, không phải `now > expiresAt`).
 */
export function isInviteExpired(expiresAt: Date, now: Date): boolean {
  return now.getTime() >= expiresAt.getTime()
}
