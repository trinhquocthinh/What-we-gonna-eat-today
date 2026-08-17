import type { Membership } from '../domain/membership'

/**
 * Port hẹp, tách khỏi `GroupRepository`: guard được gọi ở MỌI action, và fake
 * cho TC-006/TC-007 chỉ cần đúng một method.
 */
export interface MembershipRepository {
  /**
   * Trả về membership kể cả khi đã bị gỡ (`removedAt !== null`). Việc quyết định
   * "còn hiệu lực hay không" thuộc về `isActiveMembership` ở domain — xem lý do
   * trong `domain/membership.ts`.
   */
  findMembership(groupId: string, userId: string): Promise<Membership | null>
}
