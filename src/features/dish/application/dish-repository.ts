import type { GroupDishState } from '../domain/group-dish'
import type { SystemTag } from '../domain/system-tag'

export type GroupDishSummary = {
  readonly id: string
  readonly name: string
}

/**
 * Món trong danh mục kèm tag — dùng cho S-05. Tách khỏi `GroupDishSummary` để
 * `createGlobalDishAndAddToPool` không phải trả về thứ nó không biết.
 */
export type GroupDishListItem = GroupDishSummary & {
  readonly systemTags: readonly SystemTag[]
}

/** E2-T4 cần biết state để phân biệt ACTIVE (lỗi TC-099) và INACTIVE
 *  (khôi phục TC-020) khi tra theo tên trong group. */
export type GroupDishLookup = GroupDishSummary & {
  readonly state: GroupDishState
}

/** Ứng viên trùng ở phạm vi TOÀN CỤC (không giới hạn theo group). */
export type GlobalDishCandidate = {
  readonly id: string
  readonly name: string
}

export type NewDishInGroup = {
  readonly groupId: string
  readonly name: string
  readonly normalizedName: string
  readonly creatorUserId: string
  readonly systemTags: readonly SystemTag[]
}

export interface DishRepository {
  findInGroupByNormalizedName(
    groupId: string,
    normalizedName: string,
  ): Promise<GroupDishLookup | null>
  findGlobalCandidatesByNormalizedName(normalizedName: string): Promise<GlobalDishCandidate[]>
  createGlobalDishAndAddToPool(input: NewDishInGroup): Promise<GroupDishSummary>
  reactivateGroupDish(groupDishId: string): Promise<void>
  addExistingGlobalDishToGroup(input: {
    readonly groupId: string
    readonly globalDishId: string
  }): Promise<GroupDishSummary>
  listActiveInGroup(groupId: string): Promise<GroupDishListItem[]>

  /**
   * Xác nhận món ĐANG ACTIVE trong ĐÚNG group này.
   *
   * Nhận CẢ HAI id là có chủ ý bảo mật: nếu chỉ nhận `groupDishId`, một Admin
   * của Group A gửi thẳng `groupDishId` của Group B sẽ qua được vòng kiểm
   * `assertGroupAccess` (vốn chỉ kiểm quyền trên Group A) rồi sửa tag của Group
   * B. Điều kiện `AND group_id = ?` ở đây là thứ chặn đúng chuyện đó.
   */
  findActiveGroupDish(input: {
    readonly groupId: string
    readonly groupDishId: string
  }): Promise<GroupDishSummary | null>

  /** Ghi đè TOÀN BỘ tag của một món, nguyên tử. Mảng rỗng = xoá sạch (TC-023). */
  replaceSystemTags(input: {
    readonly groupDishId: string
    readonly systemTags: readonly SystemTag[]
  }): Promise<void>

  /** Đếm số món ACTIVE trong nhóm. Dùng cho guard chặn mở phiên (E6-T4 / SPEC-007). */
  countActiveInGroup(groupId: string): Promise<number>
}
