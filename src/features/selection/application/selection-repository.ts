import type { DishCard } from '../domain/dish-card'
import type { InteractionAction, InteractionType } from '../domain/interaction'

export type { DishCard }

type ParticipantState = 'ACTIVE' | 'COMPLETED' | 'REMOVED'

export type ParticipantRecord = {
  readonly id: string
  readonly state: ParticipantState
}

export interface SelectionRepository {
  /** SPEC-011/012. `null` nếu userId chưa từng là Participant của Session này. */
  findParticipant(sessionId: string, userId: string): Promise<ParticipantRecord | null>

  /**
   * SPEC-010 rút gọn + SPEC-011. Eligible Set (`group_dishes.state='ACTIVE'`
   * của Group thuộc Session), sắp ổn định theo `group_dishes.id`, kèm
   * `effectiveInteraction` hiện tại của `participantId`.
   *
   * VIẾT HAI GIAI ĐOẠN (§2.5 của Implementation Guide):
   * - E1-T8: chưa có bảng `interactions` → `effectiveInteraction` hardcode `null`.
   * - E1-T9: sửa lại thân hàm, thêm LEFT JOIN `interactions` để đọc giá trị thật.
   */
  listEligibleDishCards(sessionId: string, participantId: string): Promise<DishCard[]>

  /** SPEC-012. Session phải đang ACTIVE mới ghi được interaction. */
  findSessionState(sessionId: string): Promise<'DRAFT' | 'ACTIVE' | 'FINALIZED' | 'INVALID' | null>

  /** SPEC-012. Dish có đang Active trong Group Dish Pool của Group thuộc Session không. */
  isDishActiveInSession(sessionId: string, groupDishId: string): Promise<boolean>

  /**
   * SPEC-012 — ghi/xoá effective interaction + LUÔN append event, NGUYÊN TỬ
   * (`db.batch`). `SWIPE_RIGHT`/`SWIPE_LEFT` → upsert vào `interactions`.
   * `UNDO` → xoá khỏi `interactions` (không phải ghi giá trị rỗng — SDD §2.2:
   * "None" = không tồn tại row). Trả về effective interaction SAU thao tác.
   */
  applyInteraction(input: {
    sessionId: string
    participantId: string
    groupDishId: string
    action: InteractionAction
  }): Promise<InteractionType | null>
}
