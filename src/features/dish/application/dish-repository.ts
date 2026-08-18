/**
 * `id` là `group_dishes.id`, KHÔNG phải `global_dishes.id`. Mọi feature phía

 * sau tham chiếu đúng khoá này (Tech Spec §3.1: `interactions.group_dish_id`,
 * `final_meal_items.group_dish_id`).
 */
export type GroupDishSummary = {
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
  /**
   * Tìm món trong Group theo `normalized_name`. KHÔNG lọc `state`: quyết định
   * "đã có rồi" hay "khôi phục lại" thuộc về application — xem `add-dish-to-group.ts`.
   * E2-T4 thêm `state` vào kiểu trả về; SQL không phải đổi.
   */
  findInGroupByNormalizedName(
    groupId: string,
    normalizedName: string,
  ): Promise<GroupDishSummary | null>

  /**
   * Chèn `global_dishes` + `group_dishes` NGUYÊN TỬ (SDD §2.4). Global Dish mới
   * mang provenance bắt buộc của BR-001: user tạo, group tạo từ đó, thời điểm.
   * Hàng Group Dish sinh ra ở `state = 'ACTIVE'` (BR-005).
   */
  createGlobalDishAndAddToPool(input: NewDishInGroup): Promise<GroupDishSummary>

  /** Chỉ món `ACTIVE`. Thứ tự do adapter quyết định; luật sắp xếp thuộc E2-T6. */
  listActiveInGroup(groupId: string): Promise<GroupDishSummary[]>
}
