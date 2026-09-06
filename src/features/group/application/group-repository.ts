export type GroupSummary = {
  readonly id: string
  readonly name: string
  readonly timezone: string
  readonly targetDishCount?: number | null
}

export type GroupListItem = GroupSummary & {
  readonly memberCount: number
}

export type NewGroupWithAdmin = {
  readonly name: string
  readonly timezone: string
  readonly creatorUserId: string
}

export interface GroupRepository {
  /**
   * Chèn `groups` và `group_members` NGUYÊN TỬ (SDD §2.4). Người tạo là Member
   * kèm `is_admin = true` (SPEC-002).
   */
  createWithAdmin(input: NewGroupWithAdmin): Promise<GroupSummary>

  /** Chỉ những Group mà `userId` còn membership đang hoạt động. */
  listForUser(userId: string): Promise<GroupListItem[]>

  findById(groupId: string): Promise<GroupSummary | null>
}
