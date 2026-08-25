/**
 * SPEC-019 — "membership đang hoạt động".
 *
 * Vị từ này CỐ Ý nằm ở domain chứ không ở mệnh đề WHERE: TC-006/TC-007 là test
 * tầng A mock port, nên nếu lọc `removed_at` trong SQL thì trường hợp "member
 * đã bị gỡ" không tầng nào kiểm được.
 *
 * `listForUser` ở infrastructure có lọc `removed_at IS NULL` — đó là câu hỏi
 * "lấy dòng nào", không phải quyết định phân quyền. Hai chỗ phải khớp nhau.
 */
export type Membership = {
  readonly isAdmin: boolean
  readonly removedAt: Date | null
}

export function isActiveMembership(membership: Membership): boolean {
  return membership.removedAt === null
}
