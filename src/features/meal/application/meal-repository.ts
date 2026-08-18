export type SessionForMeal = {
  readonly id: string
  readonly creatorUserId: string
  readonly state: 'DRAFT' | 'ACTIVE' | 'FINALIZED' | 'INVALID'
  readonly decisionDate: string
}

export type DraftDish = {
  readonly groupDishId: string
}

export interface MealRepository {
  findSessionForMeal(sessionId: string): Promise<SessionForMeal | null>

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
}
