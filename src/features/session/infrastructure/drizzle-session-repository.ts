import { and, eq, inArray } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import { participants, selectionSessions } from '@/shared/db/schema'

import type {
  AddParticipantOutcome,
  NewSessionDraft,
  SessionForStart,
  SessionRepository,
  SessionSummary,
  StartDraftOutcome,
} from '../application/session-repository'

const UNIQUE_VIOLATION = '23505'
const SESSION_UNIQUENESS_CONSTRAINT = 'selection_sessions_active_per_group_date'
const PARTICIPANT_UNIQUENESS_CONSTRAINT = 'participants_session_user_unique'

/**
 * Kiểm tra lỗi vi phạm unique index PostgreSQL.
 *
 * Lưu ý về thiết kế (DEC-024):
 * Không dùng `error instanceof DatabaseError` vì hai lý do thực tế:
 * 1. Drizzle ORM bắt lỗi từ database driver rồi bọc lại trong `Error("Failed query: ...", { cause })`,
 *    do đó lỗi bắt được ở tầng repo có cấu trúc lồng `error.cause`.
 * 2. Driver HTTP `@neondatabase/serverless` ném instance của `NeonDbError` (thay vì `DatabaseError`
 *    vốn chỉ dành cho WebSocket/Pool connection).
 * Do đó, kiểm tra duck-typing qua `code === '23505'` và `constraint` trên `target` (hoặc `target.cause`)
 * là phương án duy nhất bảo đảm bắt chính xác lỗi PostgreSQL thô.
 */
function isUniqueViolation(error: unknown, constraint: string): boolean {
  if (typeof error !== 'object' || error === null) return false
  const target: Record<string, unknown> =
    'cause' in error && typeof error.cause === 'object' && error.cause !== null
      ? (error.cause as Record<string, unknown>)
      : (error as Record<string, unknown>)

  return target.code === UNIQUE_VIOLATION && target.constraint === constraint
}

const SESSION_SUMMARY_COLUMNS = {
  id: selectionSessions.id,
  groupId: selectionSessions.groupId,
  decisionDate: selectionSessions.decisionDate,
  state: selectionSessions.state,
}

async function findBlockingSessionToday(
  groupId: string,
  decisionDate: string,
): Promise<{ id: string } | null> {
  // SPEC-007: chỉ ACTIVE/FINALIZED được tính (BR-025, TC-028: session INVALID
  // không chặn tạo mới nên KHÔNG đưa vào danh sách này). FINALIZED chưa tồn
  // tại được ở S4 (E1-T10) nhưng liệt kê sẵn để E1-T10 không phải sửa lại.
  const rows = await getDb()
    .select({ id: selectionSessions.id })
    .from(selectionSessions)
    .where(
      and(
        eq(selectionSessions.groupId, groupId),
        eq(selectionSessions.decisionDate, decisionDate),
        inArray(selectionSessions.state, ['ACTIVE', 'FINALIZED']),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

async function createDraftWithCreatorParticipant(input: NewSessionDraft): Promise<SessionSummary> {
  const db = getDb()
  const sessionId = uuidv7()
  const participantId = uuidv7()

  // `db.batch([...])` của neon-http LÀ một transaction Postgres thật
  // (đã verify ở S2/S3: `neon-http/session.js` gọi `client.transaction`).
  // Non-interactive — cả hai id sinh tường minh ở đây, không dựa `$defaultFn`.
  await db.batch([
    db.insert(selectionSessions).values({
      id: sessionId,
      groupId: input.groupId,
      decisionDate: input.decisionDate,
      creatorUserId: input.creatorUserId,
      state: 'DRAFT',
    }),
    db.insert(participants).values({
      id: participantId,
      sessionId,
      userId: input.creatorUserId,
      state: 'ACTIVE',
    }),
  ])

  return { id: sessionId, groupId: input.groupId, decisionDate: input.decisionDate, state: 'DRAFT' }
}

async function startDraft(sessionId: string): Promise<StartDraftOutcome> {
  try {
    const rows = await getDb()
      .update(selectionSessions)
      .set({ state: 'ACTIVE', startedAt: new Date() })
      .where(and(eq(selectionSessions.id, sessionId), eq(selectionSessions.state, 'DRAFT')))
      .returning({
        id: selectionSessions.id,
        groupId: selectionSessions.groupId,
        decisionDate: selectionSessions.decisionDate,
      })

    const updated = rows[0]
    if (updated === undefined) {
      // WHERE không khớp: session không tồn tại HOẶC không còn DRAFT. Không
      // phân biệt hai trường hợp — cả hai đều là "không start được từ đây".
      return { outcome: 'NOT_DRAFT' }
    }

    return { outcome: 'STARTED', session: { ...updated, state: 'ACTIVE' } }
  } catch (error) {
    // Hai Start đồng thời cho hai Draft khác nhau, cùng group+date: một UPDATE
    // thắng, cái kia vi phạm partial unique index khi commit (TC-107). Đây là
    // CHỖ DUY NHẤT trong feature này bắt lỗi Postgres thô — không để
    // DatabaseError rò rỉ qua khỏi hàm này (SDD §2.3).
    if (isUniqueViolation(error, SESSION_UNIQUENESS_CONSTRAINT)) {
      return { outcome: 'ALREADY_EXISTS_TODAY' }
    }
    throw error
  }
}

// THÊM Ở S5 — đọc lại một Session đã tồn tại, mọi state. Trang deck cần
// `groupId` (assertGroupAccess) và `decisionDate` (header) trước khi biết gì
// về deck.
async function findById(sessionId: string): Promise<SessionSummary | null> {
  const rows = await getDb()
    .select(SESSION_SUMMARY_COLUMNS)
    .from(selectionSessions)
    .where(eq(selectionSessions.id, sessionId))
    .limit(1)

  return rows[0] ?? null
}

async function findDraftToday(
  groupId: string,
  decisionDate: string,
): Promise<SessionSummary | null> {
  const rows = await getDb()
    .select(SESSION_SUMMARY_COLUMNS)
    .from(selectionSessions)
    .where(
      and(
        eq(selectionSessions.groupId, groupId),
        eq(selectionSessions.decisionDate, decisionDate),
        eq(selectionSessions.state, 'DRAFT'),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

async function findForStart(sessionId: string): Promise<SessionForStart | null> {
  const db = getDb()

  const sessionRows = await db
    .select({
      id: selectionSessions.id,
      groupId: selectionSessions.groupId,
      creatorUserId: selectionSessions.creatorUserId,
      state: selectionSessions.state,
    })
    .from(selectionSessions)
    .where(eq(selectionSessions.id, sessionId))
    .limit(1)

  const session = sessionRows[0]
  if (session === undefined) {
    return null
  }

  const participantRows = await db
    .select({ userId: participants.userId })
    .from(participants)
    .where(eq(participants.sessionId, sessionId))

  return { ...session, participantUserIds: participantRows.map((row) => row.userId) }
}

async function addParticipant(input: {
  sessionId: string
  userId: string
}): Promise<AddParticipantOutcome> {
  const db = getDb()
  const participantId = uuidv7()

  try {
    await db.insert(participants).values({
      id: participantId,
      sessionId: input.sessionId,
      userId: input.userId,
      state: 'ACTIVE',
    })

    return { outcome: 'ADDED', participantId }
  } catch (error) {
    if (isUniqueViolation(error, PARTICIPANT_UNIQUENESS_CONSTRAINT)) {
      return { outcome: 'ALREADY_EXISTS' }
    }
    throw error
  }
}

export const drizzleSessionRepository: SessionRepository = {
  findBlockingSessionToday,
  createDraftWithCreatorParticipant,
  startDraft,
  findById,
  findDraftToday,
  findForStart,
  addParticipant,
}
