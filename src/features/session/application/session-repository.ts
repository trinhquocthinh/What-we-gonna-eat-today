import type { SessionState } from '../domain/session'

export type SessionSummary = {
  readonly id: string
  readonly groupId: string
  readonly decisionDate: string
  // Rộng hơn 'DRAFT' | 'ACTIVE' có chủ ý: `findById` (thêm ở S5 — xem
  // Implementation Guide S5 §…) có thể trả về Session ở bất kỳ state nào,
  // không chỉ hai state mà `createDraftWithCreatorParticipant`/`startDraft`
  // tự tạo ra. Dùng chung một type thay vì tách `SessionRecord` riêng.
  readonly state: SessionState
}

export type NewSessionDraft = {
  readonly groupId: string
  readonly decisionDate: string
  readonly creatorUserId: string
}

/**
 * Kết quả của `startDraft`, dịch sẵn từ mã lỗi Postgres — infrastructure
 * KHÔNG được để `DatabaseError` rò rỉ qua ranh giới này (SDD §2.3).
 */
export type StartDraftOutcome =
  | { readonly outcome: 'STARTED'; readonly session: SessionSummary }
  | { readonly outcome: 'NOT_DRAFT' }
  | { readonly outcome: 'ALREADY_EXISTS_TODAY' }

export interface SessionRepository {
  /**
   * SPEC-007. Chỉ Session `ACTIVE`/`FINALIZED` được tính — DRAFT/INVALID
   * KHÔNG chặn tạo Session mới (BR-025, TC-028).
   */
  findBlockingSessionToday(groupId: string, decisionDate: string): Promise<{ id: string } | null>

  /**
   * Chèn `selection_sessions` (DRAFT) + `participants` (creator, ACTIVE)
   * NGUYÊN TỬ (SDD §2.4). Người gọi trở thành Creator kiêm Participant
   * (SPEC-007, BR-020).
   */
  createDraftWithCreatorParticipant(input: NewSessionDraft): Promise<SessionSummary>

  /**
   * SPEC-008 rút gọn — một UPDATE có điều kiện `WHERE id=$1 AND state='DRAFT'`.
   * Dựa vào `selection_sessions_active_per_group_date` để bắt race (TC-107),
   * KHÔNG tự SELECT rồi so sánh state trước (Tech Spec §3.2 — race condition
   * ngay cả với hai người dùng).
   */
  startDraft(sessionId: string): Promise<StartDraftOutcome>

  /**
   * THÊM Ở S5 — trang deck (`app/sessions/[sessionId]/page.tsx`) cần
   * `groupId` (để gọi `assertGroupAccess`) và `decisionDate` (để hiện header
   * "Bữa tối · Thứ Ba 16/8") trước khi có bất kỳ dữ liệu deck nào. Không có ở
   * bản S4 gốc vì S4 không có route nào cần đọc lại một Session đã tạo.
   */
  findById(sessionId: string): Promise<SessionSummary | null>
}
