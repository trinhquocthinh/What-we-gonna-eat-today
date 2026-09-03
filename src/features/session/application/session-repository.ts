import type { SystemTag } from '@/shared/domain/system-tag'

import type { ParticipantState, SessionState } from '../domain/session'

export type SessionSummary = {
  readonly id: string
  readonly groupId: string
  readonly decisionDate: string
  readonly state: SessionState
  readonly targetDishCount?: number | null
}

export type StartDraftConfig = {
  readonly deckMode?: 'FREE' | 'COURSE'
  readonly courses?: readonly SystemTag[]
  readonly targetDishCount?: number | null
}

export type SessionForStart = {
  readonly id: string
  readonly groupId: string
  readonly creatorUserId: string
  readonly state: SessionState
  readonly participantUserIds: readonly string[]
}

export type NewSessionDraft = {
  readonly groupId: string
  readonly decisionDate: string
  readonly creatorUserId: string
}

export type ParticipantProgress = {
  readonly userId: string
  readonly displayName: string
  readonly state: ParticipantState
  readonly proposedCount: number
  readonly totalInteractions: number
}

export type SessionOverview = {
  readonly id: string
  readonly participants: readonly ParticipantProgress[]
}

/**
 * Kết quả của `startDraft`, dịch sẵn từ mã lỗi Postgres — infrastructure
 * KHÔNG được để `DatabaseError` rò rỉ qua ranh giới này (SDD §2.3).
 */
export type StartDraftOutcome =
  | { readonly outcome: 'STARTED'; readonly session: SessionSummary }
  | { readonly outcome: 'NOT_DRAFT' }
  | { readonly outcome: 'ALREADY_EXISTS_TODAY' }

export type AddParticipantOutcome =
  | { readonly outcome: 'ADDED'; readonly participantId: string }
  | { readonly outcome: 'ALREADY_EXISTS' }

export interface SessionRepository {
  /**
   * SPEC-007 / E3-T6. Chỉ Session `ACTIVE`/`FINALIZED` được tính — DRAFT/INVALID
   * KHÔNG chặn tạo Session mới (BR-025, TC-028). Trả thêm `state` để caller
   * phân biệt ACTIVE vs FINALIZED mà không cần thêm round-trip.
   */
  findBlockingSessionToday(
    groupId: string,
    decisionDate: string,
  ): Promise<{ id: string; state: SessionState } | null>

  /**
   * Chèn `selection_sessions` (DRAFT) + `participants` (creator, ACTIVE)
   * NGUYÊN TỬ (SDD §2.4). Người gọi trở thành Creator kiêm Participant
   * (SPEC-007, BR-020).
   */
  createDraftWithCreatorParticipant(input: NewSessionDraft): Promise<SessionSummary>

  /**
   * SPEC-008 rút gọn + SPEC-029. Snapshot session_rules và session_courses
   * (nếu deckMode='COURSE') trong cùng batch có guard state='DRAFT'.
   */
  startDraft(sessionId: string, config?: StartDraftConfig): Promise<StartDraftOutcome>

  /**
   * THÊM Ở S5 — trang deck (`app/sessions/[sessionId]/page.tsx`) cần
   * `groupId` (để gọi `assertGroupAccess`) và `decisionDate` (để hiện header
   * "Bữa tối · Thứ Ba 16/8") trước khi có bất kỳ dữ liệu deck nào. Không có ở
   * bản S4 gốc vì S4 không có route nào cần đọc lại một Session đã tạo.
   */
  findById(sessionId: string): Promise<SessionSummary | null>

  /**
   * MỚI — tái dùng Draft hôm nay thay vì tạo rác. `findBlockingSessionToday`
   * chỉ tính ACTIVE/FINALIZED (BR-025); đây là bản soi ngược lại: người dùng
   * ghé màn "Mở phiên" lần hai trong cùng ngày (ví dụ Start thất bại lần đầu
   * rồi quay lại) phải thấy lại đúng Draft cũ, không phải một Draft mới rỗng.
   */
  findDraftToday(groupId: string, decisionDate: string): Promise<SessionSummary | null>

  /**
   * MỚI — đọc đủ dữ liệu cho 4 bước revalidate của `startSession`. Tách khỏi
   * `findById` (dùng cho trang deck, S5) vì hai nơi cần hai hình dạng khác
   * nhau: deck cần `decisionDate` để hiện header, đây cần `creatorUserId` +
   * `participantUserIds` để kiểm quyền.
   */
  findForStart(sessionId: string): Promise<SessionForStart | null>

  /**
   * SPEC-009. Chèn `participants` với `state='ACTIVE'`, 0 tương tác (đúng
   * nghĩa "chưa có hàng interactions nào" — không cần cột đếm riêng).
   *
   * KHÔNG SELECT trước để kiểm trùng — dựa thẳng vào
   * `participants_session_user_unique` (đã có từ E1-T7/T8) và bắt lỗi vi
   * phạm, đúng khuôn `isSessionUniquenessViolation` đã dùng cho
   * `startDraft`. TC-038 ở tầng `I` (không phải `A`) chính là vì hành vi này
   * chỉ chứng minh được với DB thật.
   */
  addParticipant(input: { sessionId: string; userId: string }): Promise<AddParticipantOutcome>

  /**
   * Chèn Participant cho MỌI `userId` chưa có trong phiên, bỏ qua người đã có.
   *
   * Khác `addParticipant` ở chỗ đây là thao tác HÀNG LOẠT và IDEMPOTENT: gọi
   * lại không đổi gì, không lỗi. Cần đúng hai tính chất đó vì `openSessionAction`
   * gọi nó trên cả Draft mới tạo (Creator đã có sẵn) lẫn Draft dùng lại (có thể
   * đã đủ người từ lần bấm trước) — xem `ERR_PARTICIPANT_EXISTS` của
   * `addParticipant` là lỗi ĐÚNG cho thao tác thêm-một-người thủ công, nhưng
   * sai cho thao tác đồng bộ-cả-nhà này.
   *
   * KHÔNG đụng tới người đã `REMOVED`: `onConflictDoNothing` giữ nguyên hàng cũ,
   * nên phiên không tự kéo lại người mà Creator đã gỡ (F25, v1.1).
   */
  ensureParticipants(sessionId: string, userIds: readonly string[]): Promise<void>

  /**
   * MỚI — E3-T5. Dùng ở CẢ HAI nơi: `setParticipantCompleted` (đọc trạng thái
   * hiện tại trước khi ghi) và `app/sessions/[sessionId]/page.tsx` (khởi tạo
   * `view` ban đầu của `DeckScreen` — reload trang phải giữ đúng trạng thái
   * server, không phải luôn về `'deck'`).
   */
  findParticipantState(sessionId: string, userId: string): Promise<ParticipantState | null>

  /**
   * MỚI — E3-T5. Ghi trực tiếp, không kiểm tồn tại lại — người gọi (`setParticipantCompleted`)
   * đã xác nhận qua `findParticipantState` trước đó. `outcome: 'NOT_FOUND'`
   * là lưới an toàn cho trường hợp hiếm: participant bị đổi trạng thái giữa
   * lúc đọc và lúc ghi (ví dụ Creator gỡ ngay lúc đó — F25, ngoài v1.0 nhưng
   * cột `REMOVED` đã tồn tại).
   */
  setParticipantState(
    sessionId: string,
    userId: string,
    state: 'ACTIVE' | 'COMPLETED',
  ): Promise<{ outcome: 'UPDATED' | 'NOT_FOUND' }>

  /** MỚI — E3-T6. Một câu JOIN, không round-trip riêng cho từng participant. */
  findSessionOverview(sessionId: string): Promise<SessionOverview | null>
}
