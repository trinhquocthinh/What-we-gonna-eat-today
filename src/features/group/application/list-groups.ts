import type { GroupListItem, GroupRepository } from './group-repository'

export type ListGroupsDeps = {
  readonly groups: GroupRepository
}

/**
 * Trả mảng trực tiếp chứ không phải `Result`: đọc danh sách không có trạng thái
 * thất bại nghiệp vụ nào. Lỗi hạ tầng để nổi lên cho `app/groups/error.tsx`.
 *
 * Use case mỏng nhưng có lý do tồn tại: E1-T7 sẽ thêm luật "Group có phiên đang
 * chạy nằm trên cùng" vào đúng chỗ này, và khi đó nó có test riêng.
 */
export async function listGroups(deps: ListGroupsDeps, userId: string): Promise<GroupListItem[]> {
  return deps.groups.listForUser(userId)
}
