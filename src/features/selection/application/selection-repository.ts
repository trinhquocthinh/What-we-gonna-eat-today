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
   * SPEC-012 + R-04. `clientTimestamp` là mốc THỜI ĐIỂM NGƯỜI DÙNG THAO TÁC
   * (client báo lên) — KHÁC `interactions.updatedAt` cũ vốn là "lúc server xử
   * lý". Đây là thay đổi ngữ nghĩa có chủ ý của cột đó — xem Decision Log
   * DEC-038.
   */
  applyInteraction(input: {
    sessionId: string
    participantId: string
    groupDishId: string
    action: InteractionAction
    clientTimestamp: Date
  }): Promise<InteractionType | null>

  /** `null` = chưa materialize lần nào. Mảng RỖNG (đã materialize, 0 món) là
   *  một giá trị hợp lệ KHÁC `null` — TC-102 (Group 0 món ACTIVE) đi qua đây. */
  findMaterializedDeck(sessionId: string, userId: string): Promise<readonly string[] | null>

  /**
   * INSERT một lần. `ALREADY_MATERIALIZED` (không phải lỗi) khi race: hai
   * request đồng thời cùng lần đầu mở deck. Người gọi (`list-deck.ts`) đọc lại
   * qua `findMaterializedDeck` để cả hai hội tụ về ĐÚNG MỘT thứ tự đã thắng,
   * không phải mỗi request tự tin dùng bản mình vừa tính.
   */
  materializeDeck(
    sessionId: string,
    userId: string,
    orderedDishIds: readonly string[],
  ): Promise<{ readonly outcome: 'MATERIALIZED' | 'ALREADY_MATERIALIZED' }>
}
