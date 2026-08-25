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

  /**
   * MỚI (E3-T1 cần, xuyên qua `app/` — xem `start-session.ts` §5). Trả về
   * đúng những `userId` trong danh sách KHÔNG còn là Member đang hoạt động
   * của Group này — thiếu hẳn row hoặc `removed_at IS NOT NULL` đều tính.
   * Kèm `displayName` để E3-T2 hiện được tên cụ thể tại hàng, không phải chỉ
   * một UUID.
   */
  findInvalidMembers(
    groupId: string,
    userIds: readonly string[],
  ): Promise<{ readonly userId: string; readonly displayName: string }[]>

  /**
   * Mọi Member CÒN HIỆU LỰC của Group (`removed_at IS NULL`), kèm tên để hiện
   * ở S-08 "Tối nay ai ăn ở nhà".
   *
   * Đây là nguồn danh sách Participant lúc mở phiên: một phiên bữa cơm mặc
   * định gồm CẢ NHÀ, không phải riêng người bấm nút. Trước khi có hàm này,
   * `createDraftWithCreatorParticipant` là nơi duy nhất sinh Participant nên
   * mọi phiên đều chỉ có đúng một người, và Member khác mở deck thì nhận
   * `ERR_NOT_PARTICIPANT`.
   */
  listActiveMembers(
    groupId: string,
  ): Promise<{ readonly userId: string; readonly displayName: string }[]>
}
