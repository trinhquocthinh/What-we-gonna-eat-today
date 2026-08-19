import type { GroupDishState } from '../domain/group-dish'

export type GroupDishSummary = {
  readonly id: string
  readonly name: string
}

/** MỚI — E2-T4 cần biết state để phân biệt ACTIVE (lỗi TC-099) và INACTIVE
 *  (khôi phục TC-020) khi tra theo tên trong group. */
export type GroupDishLookup = GroupDishSummary & {
  readonly state: GroupDishState
}

/** MỚI — ứng viên trùng ở phạm vi TOÀN CỤC (không giới hạn theo group). */
export type GlobalDishCandidate = {
  readonly id: string
  readonly name: string
}

export type NewDishInGroup = {
  readonly groupId: string
  readonly name: string
  readonly normalizedName: string
  readonly creatorUserId: string
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
  listActiveInGroup(groupId: string): Promise<GroupDishSummary[]>
}
