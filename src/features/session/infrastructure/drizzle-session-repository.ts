import { and, eq, inArray, lt, ne, sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { buildSnapshotStatement } from '@/features/rule/infrastructure/drizzle-rule-repository'
import { getDb } from '@/shared/db/client'
import {
  interactions,
  participants,
  selectionSessions,
  sessionCourses,
  users,
} from '@/shared/db/schema'
import type { SystemTag } from '@/shared/domain/system-tag'

import type {
  AddParticipantOutcome,
  NewSessionDraft,
  SessionForStart,
  SessionOverview,
  SessionRepository,
  SessionSummary,
  StartDraftConfig,
  StartDraftOutcome,
} from '../application/session-repository'
import type { ParticipantState, SessionState } from '../domain/session'

const UNIQUE_VIOLATION = '23505'
const SESSION_UNIQUENESS_CONSTRAINT = 'selection_sessions_active_per_group_date'
const PARTICIPANT_UNIQUENESS_CONSTRAINT = 'participants_session_user_unique'

type Database = ReturnType<typeof getDb>

/**
 * SPEC-029 — snapshot chặng. `INSERT … SELECT` chứ KHÔNG `INSERT … VALUES`:
 * guard `state = 'DRAFT'` nằm trong SELECT là toàn bộ cơ chế cách ly, y hệt
 * `buildSnapshotStatement` của feature `rule` (Guide §1.3). Một câu VALUES sẽ
 * ghi cả khi session không còn DRAFT.
 *
 * Tối đa 5 câu (5 System Tag), tất cả tự chứa nên `db.batch()` của driver HTTP
 * đủ dùng — cùng ràng buộc đã ghi ở `shared/db/client.ts`.
 */
function buildCourseSnapshotStatements(
  db: Database,
  sessionId: string,
  courses: readonly SystemTag[],
) {
  return courses.map((tag, position) =>
    db
      .insert(sessionCourses)
      .select(
        db
          .select({
            sessionId: selectionSessions.id,
            position: sql<number>`${position}`.as('position'),
            systemTag: sql<SystemTag>`${tag}::system_tag`.as('system_tag'),
          })
          .from(selectionSessions)
          .where(and(eq(selectionSessions.id, sessionId), eq(selectionSessions.state, 'DRAFT'))),
      )
      .onConflictDoNothing(),
  )
}

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
  targetDishCount: selectionSessions.targetDishCount,
}

async function findBlockingSessionToday(
  groupId: string,
  decisionDate: string,
): Promise<{ id: string; state: SessionState } | null> {
  // SPEC-007: chỉ ACTIVE/FINALIZED được tính (BR-025, TC-028: session INVALID
  // không chặn tạo mới nên KHÔNG đưa vào danh sách này). FINALIZED chưa tồn
  // tại được ở S4 (E1-T10) nhưng liệt kê sẵn để E1-T10 không phải sửa lại.
  const rows = await getDb()
    .select({ id: selectionSessions.id, state: selectionSessions.state })
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

/**
 * SPEC-008 + SPEC-022 + SPEC-029. Snapshot Group Rule VÀ Session Courses, MỘT giao dịch, THỨ TỰ CỐ ĐỊNH:
 *
 *   1. Snapshot Group Rule → Session Rule, guard `state = 'DRAFT'`.
 *   2. Snapshot Session Courses (nếu deckMode='COURSE'), guard `state = 'DRAFT'`.
 *   3. UPDATE state → ACTIVE + set deck_mode, guard `state = 'DRAFT'`.
 *
 * Các câu snapshot PHẢI đứng trước câu UPDATE: nó dựa vào việc state chưa đổi để phân biệt
 * "vừa start ngay bây giờ" với "đã ACTIVE từ trước".
 *
 * `db.batch()` của neon-http LÀ transaction Postgres thật (verify từ E4-S2,
 * `commitFinalize` đang dựa vào cho TC-109). Cả các câu tự chứa nên KHÔNG cần
 * interactive transaction, tức KHÔNG cần driver WebSocket.
 */
async function startDraft(
  sessionId: string,
  config?: StartDraftConfig,
): Promise<StartDraftOutcome> {
  const db = getDb()
  const deckMode = config?.deckMode ?? 'FREE'
  const courses = deckMode === 'COURSE' ? (config?.courses ?? []) : []
  const targetDishCount = config?.targetDishCount ?? null

  try {
    const courseStatements = buildCourseSnapshotStatements(db, sessionId, courses)
    const results = await db.batch([
      buildSnapshotStatement(db, sessionId),
      ...courseStatements,
      db
        .update(selectionSessions)
        .set({ state: 'ACTIVE', startedAt: new Date(), deckMode, targetDishCount })
        .where(and(eq(selectionSessions.id, sessionId), eq(selectionSessions.state, 'DRAFT')))
        .returning({
          id: selectionSessions.id,
          groupId: selectionSessions.groupId,
          decisionDate: selectionSessions.decisionDate,
          targetDishCount: selectionSessions.targetDishCount,
        }),
    ])

    const rows = results[results.length - 1] as unknown as {
      id: string
      groupId: string
      decisionDate: string
      targetDishCount: number | null
    }[]
    const updated = rows[0]
    if (updated === undefined) {
      // WHERE không khớp: session không tồn tại HOẶC không còn DRAFT. Các câu
      // snapshot ở trên cũng không khớp vì cùng điều kiện — không có dòng
      // session_rules / session_courses mồ côi nào được tạo.
      return { outcome: 'NOT_DRAFT' }
    }

    return { outcome: 'STARTED', session: { ...updated, state: 'ACTIVE' } }
  } catch (error) {
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

async function ensureParticipants(sessionId: string, userIds: readonly string[]): Promise<void> {
  if (userIds.length === 0) return

  await getDb()
    .insert(participants)
    .values(
      userIds.map((userId) => ({
        id: uuidv7(),
        sessionId,
        userId,
        state: 'ACTIVE' as const,
      })),
    )
    .onConflictDoNothing({ target: [participants.sessionId, participants.userId] })
}

async function findParticipantState(
  sessionId: string,
  userId: string,
): Promise<ParticipantState | null> {
  const rows = await getDb()
    .select({ state: participants.state })
    .from(participants)
    .where(and(eq(participants.sessionId, sessionId), eq(participants.userId, userId)))
    .limit(1)

  return rows[0]?.state ?? null
}

async function setParticipantState(
  sessionId: string,
  userId: string,
  state: 'ACTIVE' | 'COMPLETED',
): Promise<{ outcome: 'UPDATED' | 'NOT_FOUND' }> {
  const rows = await getDb()
    .update(participants)
    .set({ state })
    .where(and(eq(participants.sessionId, sessionId), eq(participants.userId, userId)))
    .returning({ id: participants.id })

  return { outcome: rows[0] === undefined ? 'NOT_FOUND' : 'UPDATED' }
}

/**
 * JOIN `participants` + `users` (tên hiển thị) + `LEFT JOIN interactions`
 * (đếm). Lọc `state != 'REMOVED'` — F25 (gỡ participant) ngoài v1.0 nhưng
 * cột đã tồn tại, phòng hờ rẻ.
 *
 * `proposedCount` đếm riêng `SWIPE_RIGHT` (chữ hiển thị "Xong · N món"), còn
 * `totalInteractions` đếm MỌI loại — cần cả hai vì "Chưa mở" (0 tương tác
 * bất kỳ) khác "Đang chọn" (có tương tác nhưng chưa đề xuất món nào), một
 * phân biệt mà chỉ đếm `SWIPE_RIGHT` không thấy được.
 */
async function findSessionOverview(sessionId: string): Promise<SessionOverview | null> {
  const db = getDb()

  const rows = await db
    .select({
      userId: participants.userId,
      displayName: users.displayName,
      state: participants.state,
      proposedCount: sql<number>`count(${interactions.id}) filter (where ${interactions.type} = 'SWIPE_RIGHT')`,
      totalInteractions: sql<number>`count(${interactions.id})`,
    })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .leftJoin(interactions, eq(interactions.participantId, participants.id))
    .where(and(eq(participants.sessionId, sessionId), ne(participants.state, 'REMOVED')))
    .groupBy(participants.id, participants.userId, users.displayName, participants.state)

  if (rows.length === 0) {
    return null
  }

  return {
    id: sessionId,
    participants: rows.map((row) => ({
      ...row,
      proposedCount: Number(row.proposedCount),
      totalInteractions: Number(row.totalInteractions),
    })),
  }
}

/**
 * SPEC-034 / BR-055 — đóng mọi phiên quá hạn của một Group.
 *
 * IDEMPOTENT: một câu UPDATE thuần, không đọc-rồi-ghi, không phụ thuộc trạng
 * thái trước đó. Chạy lần thứ hai không khớp dòng nào. Đó là lý do DUY NHẤT
 * khiến gọi nó trong render của một Server Component là hợp lệ (Guide §1.4) —
 * đừng thêm bước đọc nào vào đây.
 */
async function invalidateExpiredSessions(groupId: string, referenceDate: string): Promise<void> {
  const db = getDb()
  await db
    .update(selectionSessions)
    .set({ state: 'INVALID' })
    .where(
      and(
        eq(selectionSessions.groupId, groupId),
        inArray(selectionSessions.state, ['DRAFT', 'ACTIVE']),
        lt(selectionSessions.decisionDate, referenceDate),
      ),
    )
}

export const drizzleSessionRepository: SessionRepository = {
  findBlockingSessionToday,
  createDraftWithCreatorParticipant,
  startDraft,
  findById,
  findDraftToday,
  findForStart,
  addParticipant,
  ensureParticipants,
  findParticipantState,
  setParticipantState,
  findSessionOverview,
  invalidateExpiredSessions,
}
