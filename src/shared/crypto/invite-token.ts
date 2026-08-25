import { createHash, randomBytes } from 'node:crypto'

/**
 * SPEC-003: token ≥128-bit, ngẫu nhiên, DB chỉ lưu hash — KHÔNG BAO GIỜ lưu
 * token thô. `randomBytes(24)` = 192 bit, dư an toàn so với yêu cầu 128 bit.
 * `base64url` (không phải `base64`) để token an toàn khi nhét thẳng vào URL
 * (`/join/<token>`) mà không cần encode thêm — không có `+`, `/`, `=`.
 */
export function generateInviteToken(): string {
  return randomBytes(24).toString('base64url')
}

/**
 * SHA-256, không phải bcrypt/argon2: token đã có ≥192 bit entropy ngẫu nhiên
 * (khác mật khẩu người dùng tự chọn — không cần làm chậm để chống brute-force
 * từ điển). Hash chỉ để không lưu token thô trong DB, không phải để chống dò.
 */
export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
