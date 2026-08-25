import type { SystemTag } from '@/shared/domain/system-tag'

export type SessionForMeal = {
  readonly id: string
  readonly creatorUserId: string
  readonly state: 'DRAFT' | 'ACTIVE' | 'FINALIZED' | 'INVALID'
  readonly decisionDate: string
}

export type DraftDish = {
  readonly groupDishId: string
}

export type FinalMealView = {
  readonly decisionDate: string
  readonly finalizedAt: Date
  readonly finalizedByDisplayName: string
  readonly dishes: readonly {
    readonly groupDishId: string
    readonly name: string
    readonly systemTags: readonly SystemTag[]
  }[]
  readonly participantNames: readonly string[]
}

export interface MealRepository {
  findSessionForMeal(sessionId: string): Promise<SessionForMeal | null>

  /**
   * SPEC-016 bước 6 / BR-052 — System Tag HIỆN TẠI của các món trong nháp.
   *
   * Đọc thẳng `group_dish_tags` mà không import `features/dish`: cùng khuôn
   * `findInactiveDishIds` ngay trên — tầng infrastructure đang đọc một BẢNG,
   * không đang mượn KIẾN THỨC MIỀN của feature khác. `ALLOWED_CROSS_FEATURE`
   * không có `meal → dish` và không cần có.
   *
   * Món không có tag nào KHÔNG xuất hiện trong Map. Người gọi dùng `?? []` —
   * "món chưa gắn nhãn" là trạng thái hợp lệ (E2-T5 cho phép mảng rỗng), không
   * phải lỗi dữ liệu.
   */
  findSystemTagsByGroupDish(groupDishIds: readonly string[]): Promise<Map<string, SystemTag[]>>

  /**
   * SPEC-015/016. `groupDishId` nào trong danh sách KHÔNG active — mảng rỗng
   * = tất cả hợp lệ. Nhận `sessionId` (không phải `groupId` trần) vì mọi
   * caller ở `application/` đều có sẵn `sessionId`, còn `groupId` thì không
   * — infrastructure tự resolve `groupId` qua JOIN (xem §8.1).
   */
  findInactiveDishIds(sessionId: string, groupDishIds: readonly string[]): Promise<string[]>

  /**
   * SPEC-015 — upsert `final_meals` (tạo nếu chưa có) rồi GHI ĐÈ toàn bộ
   * `final_meal_items` (không cộng dồn). Trả `finalMealId` để caller dùng
   * tiếp (ví dụ Finalize).
   */
  saveDraft(sessionId: string, groupDishIds: readonly string[]): Promise<{ finalMealId: string }>

  /** Đọc nháp hiện tại — dùng ở bước validate của Finalize (bước 3, 4 SPEC-016). */
  getDraft(sessionId: string): Promise<{ finalMealId: string; groupDishIds: string[] } | null>

  /** ACTIVE hoặc COMPLETED — REMOVED không nhận Default Eating History (BR-026). */
  listActiveParticipantUserIds(sessionId: string): Promise<string[]>

  /** Map `group_dish_id → global_dish_id` cho danh sách món trong nháp. */
  resolveGlobalDishIds(groupDishIds: readonly string[]): Promise<Map<string, string>>

  /**
   * NGUYÊN TỬ — CHỈ hai việc: UPDATE session sang FINALIZED, và INSERT toàn
   * bộ dòng `eating_history`. KHÔNG validate gì (đó là việc của
   * `finalizeSession` ở application, chạy TRƯỚC khi gọi hàm này). Tách riêng
   * để TC-109 gọi thẳng được với dữ liệu cố ý sai — xem Implementation Guide
   * §2.5.
   */
  commitFinalize(input: {
    sessionId: string
    eatingHistoryRows: readonly {
      userId: string
      globalDishId: string
      eatingDate: string
      sourceFinalMealId: string
    }[]
  }): Promise<void>

  /**
   * SPEC-016 phía ĐỌC — mâm cơm đã chốt, đủ để dựng S-11 trong một lần gọi.
   *
   * Trả `null` khi Session không tồn tại HOẶC chưa `FINALIZED`. Gộp hai
   * trường hợp có chủ ý: cả hai đều là "không có mâm cơm để xem ở đây", và
   * phân biệt chúng chỉ để lộ ra phiên nào tồn tại (NFR-04) mà không giúp
   * người dùng thêm được gì.
   *
   * KHÁC `getDraft`: `getDraft` đọc `final_meal_items` khi Session còn
   * `ACTIVE` để Finalize kiểm tra; hàm này đọc CÙNG bảng đó sau khi Session đã
   * `FINALIZED`, kèm tên món, tên người chốt và danh sách người tham gia. Cùng
   * dữ liệu, hai thời điểm, hai mục đích — không gộp.
   */
  findFinalMeal(sessionId: string): Promise<FinalMealView | null>
}
