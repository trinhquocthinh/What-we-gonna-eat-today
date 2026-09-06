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
  /** M3-T5 — Sở thích và ràng buộc cá nhân khoá theo `global_dishes.id`, không
   *  theo `group_dishes.id`: chúng theo NGƯỜI qua mọi nhóm (SPEC-024/025). Màn
   *  Danh mục cần id này để tra trạng thái Like/Dislike/Cannot Eat của từng dòng. */
  readonly globalDishId: string
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

  /**
   * Gợi ý món từ catalog CHUNG trong lúc người dùng đang gõ (SPEC-023).
   *
   * Khác `findGlobalCandidatesByNormalizedName` ở hai điểm quyết định:
   * - khớp CHUỖI CON, không phải bằng nhau — gõ "chả" phải ra "Bún chả", vì
   *   tên món Việt hiếm khi bắt đầu bằng chữ mà người ta nhớ ra trước;
   * - LOẠI món nhóm đang có (ACTIVE) ngay trong SQL. Lọc ở client thì `LIMIT`
   *   chạy TRƯỚC phép lọc: nhóm đã sở hữu 5 kết quả đầu là panel rỗng oan,
   *   trong khi ứng viên mới nằm ngay dưới ngưỡng.
   *
   * Món đang INACTIVE trong nhóm thì VẪN hiện — chọn lại chính là cách thêm
   * lại nó, và `addExistingGlobalDishToGroup` đã tự lật về ACTIVE.
   */
  searchGlobalDishes(input: {
    readonly groupId: string
    readonly needle: string
    readonly limit: number
  }): Promise<GlobalDishCandidate[]>
  createGlobalDishAndAddToPool(input: NewDishInGroup): Promise<GroupDishSummary>
  reactivateGroupDish(groupDishId: string): Promise<void>
  /** BR-005 — gỡ món khỏi nhóm. KHÔNG xoá dòng: lịch sử ăn và tương tác cũ vẫn
   *  phải tra ngược được (DEC-009). Chiều ngược đã có sẵn: `reactivateGroupDish`. */
  deactivateGroupDish(groupDishId: string): Promise<void>
  addExistingGlobalDishToGroup(input: {
    readonly groupId: string
    readonly globalDishId: string
  }): Promise<GroupDishSummary>
  listActiveInGroup(groupId: string): Promise<GroupDishListItem[]>
  /** BR-005 — món đã gỡ, cho mục "Đã gỡ khỏi nhóm" của S-05.
   *
   *  RIÊNG method chứ không thêm tham số vào `listActiveInGroup`: tên hàm đó nói
   *  đúng thứ nó làm, và mọi chỗ gọi hiện tại đều muốn đúng tập ACTIVE. Hai truy
   *  vấn thay vì một `WHERE state = ANY(...)` là chuyện không đo được ở quy mô
   *  một nhóm gia đình. */
  listInactiveInGroup(groupId: string): Promise<GroupDishListItem[]>

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
