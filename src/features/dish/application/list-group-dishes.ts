import type { DishRepository, GroupDishListItem } from './dish-repository'

export type ListGroupDishesDeps = {
  readonly dishes: DishRepository
}

/**
 * Trả mảng trực tiếp chứ không phải `Result`: đọc danh sách không có trạng thái
 * thất bại nghiệp vụ nào. Lỗi hạ tầng để nổi lên cho `dishes/error.tsx`.
 *
 * Mỏng nhưng có lý do tồn tại: E2-T5/E2-T6 thêm nhóm theo System Tag và lọc
 * theo từ khoá vào đúng chỗ này, và khi đó nó có test riêng.
 */
export async function listGroupDishes(
  deps: ListGroupDishesDeps,
  groupId: string,
): Promise<GroupDishListItem[]> {
  return deps.dishes.listActiveInGroup(groupId)
}
