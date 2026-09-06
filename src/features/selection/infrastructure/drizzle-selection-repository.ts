import { and, eq, inArray, notExists, sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import {
  globalDishes,
  groupDishes,
  groupDishTags,
  interactionEvents,
  interactions,
  participants,
  selectionSessions,
  sessionCourses,
  sessionDecks,
  userDishConstraints,
  userPreferenceSettings,
} from '@/shared/db/schema'
import { toSystemTags, type SystemTag } from '@/shared/domain/system-tag'

import type { ImplicitSwipe } from '../domain/implicit-preference'
import type { InteractionAction, InteractionType } from '../domain/interaction'
import type {
  DishCard,
  ParticipantRecord,
  SelectionRepository,
} from '../application/selection-repository'

async function findParticipant(
  sessionId: string,
  userId: string,
): Promise<ParticipantRecord | null> {
  const rows = await getDb()
    .select({ id: participants.id, state: participants.state })
    .from(participants)
    .where(and(eq(participants.sessionId, sessionId), eq(participants.userId, userId)))
    .limit(1)

  return rows[0] ?? null
}

/**
 * VIẾT HAI GIAI ĐOẠN — xem Implementation Guide §2.5 và §9.1.
 *
 * Bản dưới đây là bản SAU E1-T9 (có LEFT JOIN `interactions`).
 * E7-S2 (§1.1): Nhận `userId` và lọc `NOT EXISTS` trên `user_dish_constraints`
 * để loại bỏ món Cannot Eat ngay ở tầng SQL (BR-034).
 */
async function listEligibleDishCards(
  sessionId: string,
  participantId: string,
  userId: string,
): Promise<DishCard[]> {
  const rows = await getDb()
    .select({
      dishId: groupDishes.id,
      globalDishId: globalDishes.id,
      name: globalDishes.name,
      effectiveType: interactions.type,
      systemTags: sql<
        string[]
      >`coalesce(json_agg(distinct ${groupDishTags.systemTag}) filter (where ${groupDishTags.systemTag} is not null), '[]'::json)`,
    })
    .from(groupDishes)
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .innerJoin(selectionSessions, eq(selectionSessions.groupId, groupDishes.groupId))
    .leftJoin(groupDishTags, eq(groupDishTags.groupDishId, groupDishes.id))
    .leftJoin(
      interactions,
      and(
        eq(interactions.groupDishId, groupDishes.id),
        eq(interactions.sessionId, sessionId),
        eq(interactions.participantId, participantId),
      ),
    )
    .where(
      and(
        eq(selectionSessions.id, sessionId),
        eq(groupDishes.state, 'ACTIVE'),
        // BR-034 + BR-035 — Stage 1 Hard Filter. Lọc ở SQL chứ không ở tầng
        // trên: LIMIT và phân trang chạy SAU phép lọc, cùng lý lẽ DEC-055 mục 3.
        //
        // MỆNH ĐỀ `kind` LÀ BẮT BUỘC, không phải trang trí (E13-S1 Guide §1.1).
        // Trước E13 bảng chỉ có một loại dòng, nên câu hỏi "user có dòng nào cho
        // món này không" tình cờ trùng với "user có khai Cannot Eat không". Sau
        // khi có cột `kind` thì không còn trùng: bỏ mệnh đề này đi thì một dòng
        // `HISTORY_WHITELIST` cũng làm `notExists` trả false, và món được
        // Whitelist BIẾN MẤT khỏi deck — đúng ngược điều BR-036 muốn.
        notExists(
          getDb()
            .select({ one: sql`1` })
            .from(userDishConstraints)
            .where(
              and(
                eq(userDishConstraints.userId, userId),
                eq(userDishConstraints.globalDishId, globalDishes.id),
                inArray(userDishConstraints.kind, ['CANNOT_EAT', 'BLACKLIST']),
              ),
            ),
        ),
      ),
    )
    .groupBy(groupDishes.id, globalDishes.id, globalDishes.name, interactions.type)
    .orderBy(groupDishes.id)

  return rows.map((row) => ({
    dishId: row.dishId,
    globalDishId: row.globalDishId,
    name: row.name,
    systemTags: toSystemTags(row.systemTags),
    effectiveInteraction: row.effectiveType,
    daysSinceLastEaten: null,
    lane: 'EXPLOIT' as const,
  }))
}

async function findSessionState(
  sessionId: string,
): Promise<'DRAFT' | 'ACTIVE' | 'FINALIZED' | 'INVALID' | null> {
  const rows = await getDb()
    .select({ state: selectionSessions.state })
    .from(selectionSessions)
    .where(eq(selectionSessions.id, sessionId))
    .limit(1)

  return rows[0]?.state ?? null
}

async function isDishActiveInSession(sessionId: string, groupDishId: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: groupDishes.id })
    .from(groupDishes)
    .innerJoin(selectionSessions, eq(selectionSessions.groupId, groupDishes.groupId))
    .where(
      and(
        eq(selectionSessions.id, sessionId),
        eq(groupDishes.id, groupDishId),
        eq(groupDishes.state, 'ACTIVE'),
      ),
    )
    .limit(1)

  return rows.length > 0
}

async function applyInteraction(input: {
  sessionId: string
  participantId: string
  groupDishId: string
  action: InteractionAction
  clientTimestamp: Date
}): Promise<InteractionType | null> {
  const db = getDb()

  if (input.action === 'UNDO') {
    // KHÔNG đổi — xem Implementation Guide §4 cho lý do UNDO không được
    // timestamp-guard ở slice này.
    await db.batch([
      db
        .delete(interactions)
        .where(
          and(
            eq(interactions.sessionId, input.sessionId),
            eq(interactions.participantId, input.participantId),
            eq(interactions.groupDishId, input.groupDishId),
          ),
        ),
      db.insert(interactionEvents).values({
        id: uuidv7(),
        sessionId: input.sessionId,
        participantId: input.participantId,
        groupDishId: input.groupDishId,
        action: 'UNDO',
      }),
    ])
    return null
  }

  const type: InteractionType = input.action

  /**
   * R-04, TC-106 — `setWhere` chặn UPDATE nếu dòng đang lưu MỚI hơn
   * `clientTimestamp` này. `.returning()` trả rỗng khi bị chặn — KHÔNG phải
   * lỗi. `interactionEvents` vẫn ghi audit log dù bị chặn (DEC-025 — mọi
   * request đều để lại vết, kể cả bị từ chối).
   */
  const [upsertedRows] = await db.batch([
    db
      .insert(interactions)
      .values({
        id: uuidv7(),
        sessionId: input.sessionId,
        participantId: input.participantId,
        groupDishId: input.groupDishId,
        type,
        updatedAt: input.clientTimestamp,
      })
      .onConflictDoUpdate({
        target: [interactions.sessionId, interactions.participantId, interactions.groupDishId],
        set: { type, updatedAt: input.clientTimestamp },
        setWhere: sql`${interactions.updatedAt} < ${input.clientTimestamp}`,
      })
      .returning({ type: interactions.type }),
    db.insert(interactionEvents).values({
      id: uuidv7(),
      sessionId: input.sessionId,
      participantId: input.participantId,
      groupDishId: input.groupDishId,
      action: input.action,
    }),
  ])

  const upserted = upsertedRows[0]
  if (upserted !== undefined) {
    // Thắng — dòng vừa ghi CHÍNH LÀ giá trị hiệu lực.
    return upserted.type
  }

  // Thua race hiếm: một request khác (có clientTimestamp mới hơn) đã tới
  // trước, dù có thể tới SAU về mặt mạng. Đọc lại giá trị THẬT — KHÔNG trả
  // `type` mà request này vừa gửi, vì đó không còn là giá trị hiệu lực.
  const current = await db
    .select({ type: interactions.type })
    .from(interactions)
    .where(
      and(
        eq(interactions.sessionId, input.sessionId),
        eq(interactions.participantId, input.participantId),
        eq(interactions.groupDishId, input.groupDishId),
      ),
    )
    .limit(1)

  return current[0]?.type ?? null
}

const UNIQUE_VIOLATION = '23505'
const SESSION_DECK_PK_VIOLATION_CONSTRAINT = 'session_decks_session_id_user_id_pk'

/* jscpd:ignore-start */
function isSessionDeckAlreadyMaterialized(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const target: Record<string, unknown> =
    'cause' in error && typeof error.cause === 'object' && error.cause !== null
      ? (error.cause as Record<string, unknown>)
      : (error as Record<string, unknown>)

  return (
    target.code === UNIQUE_VIOLATION && target.constraint === SESSION_DECK_PK_VIOLATION_CONSTRAINT
  )
}
/* jscpd:ignore-end */

async function findMaterializedDeck(
  sessionId: string,
  userId: string,
): Promise<readonly string[] | null> {
  const rows = await getDb()
    .select({ orderedDishIds: sessionDecks.orderedDishIds })
    .from(sessionDecks)
    .where(and(eq(sessionDecks.sessionId, sessionId), eq(sessionDecks.userId, userId)))
    .limit(1)

  // `rows[0]?.orderedDishIds ?? null`: một mảng RỖNG là giá trị hợp lệ (không
  // "nullish"), nên toán tử `??` KHÔNG nhầm nó với "chưa materialize". Chỉ khi
  // `rows[0]` chính nó là `undefined` (không có dòng nào) mới trả `null`.
  return rows[0]?.orderedDishIds ?? null
}

async function materializeDeck(
  sessionId: string,
  userId: string,
  orderedDishIds: readonly string[],
): Promise<{ outcome: 'MATERIALIZED' | 'ALREADY_MATERIALIZED' }> {
  try {
    await getDb()
      .insert(sessionDecks)
      .values({ sessionId, userId, orderedDishIds: [...orderedDishIds] })
    return { outcome: 'MATERIALIZED' }
  } catch (error) {
    if (isSessionDeckAlreadyMaterialized(error)) {
      return { outcome: 'ALREADY_MATERIALIZED' }
    }
    throw error
  }
}

async function findSessionForRanking(
  sessionId: string,
): Promise<{ creatorUserId: string; decisionDate: string } | null> {
  const rows = await getDb()
    .select({
      creatorUserId: selectionSessions.creatorUserId,
      decisionDate: selectionSessions.decisionDate,
      state: selectionSessions.state,
    })
    .from(selectionSessions)
    .where(eq(selectionSessions.id, sessionId))
    .limit(1)

  const row = rows[0]
  if (row === undefined || row.state !== 'ACTIVE') {
    return null
  }

  return { creatorUserId: row.creatorUserId, decisionDate: row.decisionDate }
}

async function countInteractionsByDish(sessionId: string): Promise<
  {
    groupDishId: string
    globalDishId: string
    name: string
    systemTags: readonly SystemTag[]
    proposedCount: number
    rejectedCount: number
  }[]
> {
  const rows = await getDb()
    .select({
      groupDishId: groupDishes.id,
      globalDishId: groupDishes.globalDishId,
      name: globalDishes.name,
      systemTags: sql<
        string[]
      >`coalesce(json_agg(distinct ${groupDishTags.systemTag}) filter (where ${groupDishTags.systemTag} is not null), '[]'::json)`,
      proposedCount: sql<string>`COUNT(DISTINCT ${interactions.id}) FILTER (WHERE ${interactions.type} = 'SWIPE_RIGHT' AND ${participants.id} IS NOT NULL)`,
      rejectedCount: sql<string>`COUNT(DISTINCT ${interactions.id}) FILTER (WHERE ${interactions.type} = 'SWIPE_LEFT' AND ${participants.id} IS NOT NULL)`,
    })
    .from(selectionSessions)
    .innerJoin(
      groupDishes,
      and(eq(groupDishes.groupId, selectionSessions.groupId), eq(groupDishes.state, 'ACTIVE')),
    )
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .leftJoin(groupDishTags, eq(groupDishTags.groupDishId, groupDishes.id))
    .leftJoin(
      interactions,
      and(
        eq(interactions.groupDishId, groupDishes.id),
        eq(interactions.sessionId, selectionSessions.id),
      ),
    )
    .leftJoin(
      participants,
      and(eq(participants.id, interactions.participantId), sql`${participants.state} <> 'REMOVED'`),
    )
    .where(eq(selectionSessions.id, sessionId))
    .groupBy(groupDishes.id, groupDishes.globalDishId, globalDishes.name)
    .orderBy(groupDishes.id)

  return rows.map((row) => ({
    groupDishId: row.groupDishId,
    globalDishId: row.globalDishId,
    name: row.name,
    systemTags: toSystemTags(row.systemTags),
    proposedCount: Number(row.proposedCount),
    rejectedCount: Number(row.rejectedCount),
  }))
}

async function countCannotEatByDish(sessionId: string): Promise<Map<string, number>> {
  const rows = await getDb()
    .select({
      globalDishId: userDishConstraints.globalDishId,
      cannotEatCount: sql<string>`COUNT(DISTINCT ${userDishConstraints.userId})`,
    })
    .from(userDishConstraints)
    .innerJoin(
      participants,
      and(
        eq(participants.userId, userDishConstraints.userId),
        eq(participants.sessionId, sessionId),
        inArray(participants.state, ['ACTIVE', 'COMPLETED']),
      ),
    )
    // $X$ đếm SỐ NGƯỜI khai `Cannot Eat` (BR-034). Blacklist KHÔNG trừ điểm
    // $X$: nó nói "đừng gợi ý cho tôi nữa", không nói "tôi không ăn được" —
    // SPEC-038 tách hai chuyện đó bằng chữ, và `TC-166` canh đúng ranh giới này.
    .where(eq(userDishConstraints.kind, 'CANNOT_EAT'))
    .groupBy(userDishConstraints.globalDishId)

  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(row.globalDishId, Number(row.cannotEatCount))
  }

  return map
}

async function listRankingParticipantUserIds(sessionId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ userId: participants.userId })
    .from(participants)
    .where(
      and(
        eq(participants.sessionId, sessionId),
        inArray(participants.state, ['ACTIVE', 'COMPLETED']),
      ),
    )

  return rows.map((row) => row.userId)
}

async function findSessionCourses(sessionId: string): Promise<{
  readonly deckMode: 'FREE' | 'COURSE'
  readonly courses: readonly SystemTag[]
}> {
  const db = getDb()
  const [sessionRows, courseRows] = await Promise.all([
    db
      .select({ deckMode: selectionSessions.deckMode })
      .from(selectionSessions)
      .where(eq(selectionSessions.id, sessionId))
      .limit(1),
    db
      .select({ systemTag: sessionCourses.systemTag })
      .from(sessionCourses)
      .where(eq(sessionCourses.sessionId, sessionId))
      .orderBy(sessionCourses.position),
  ])

  return {
    deckMode: sessionRows[0]?.deckMode ?? 'FREE',
    courses: courseRows.map((r) => r.systemTag),
  }
}

/**
 * SPEC-037 — xem doc ở `SelectionRepository.findImplicitSwipes`.
 *
 * Đường join đi NGƯỢC mọi đường truy cập cũ của hai bảng này: `interactions` và
 * `participants` chỉ có index theo `session_id`, hợp với câu hỏi "phiên này có
 * gì". Câu dưới đây hỏi "NGƯỜI này đã vuốt gì, xuyên mọi phiên" — nên E13-T1
 * thêm `participants(user_id)` và `interactions(participant_id)`.
 *
 * Mốc quên nằm ngay trong `where` thay vì một lượt đọc thứ hai (DEC-070). Phép
 * so sánh quy `implicit_reset_at` (timestamptz) về `::date` ở UTC để đọ với
 * `decision_date` (date): sai lệch tối đa một ngày, quanh đúng thời điểm bấm
 * nút — người bấm "quên" không có kỳ vọng nào về việc phiên lúc 23h hôm qua có
 * được tính hay không.
 */
async function findImplicitSwipes(
  userId: string,
  globalDishIds: readonly string[],
): Promise<ImplicitSwipe[]> {
  if (globalDishIds.length === 0) {
    return []
  }

  const rows = await getDb()
    .select({
      globalDishId: groupDishes.globalDishId,
      type: interactions.type,
      decisionDate: selectionSessions.decisionDate,
    })
    .from(interactions)
    .innerJoin(
      participants,
      and(eq(participants.id, interactions.participantId), eq(participants.userId, userId)),
    )
    .innerJoin(
      selectionSessions,
      and(
        eq(selectionSessions.id, interactions.sessionId),
        // Chỉ phiên đã chốt. Phiên `ACTIVE` đang chạy chưa phải một quyết định
        // — học từ nó nghĩa là deck tự sắp lại mình theo chính những lượt vừa
        // vuốt, đúng thứ BR-048 sinh ra để ngăn. Phiên `INVALID` là một quyết
        // định đã bị huỷ (TC-163).
        eq(selectionSessions.state, 'FINALIZED'),
      ),
    )
    .innerJoin(
      groupDishes,
      and(
        eq(groupDishes.id, interactions.groupDishId),
        // Gắn theo `global_dishes.id`, không theo `group_dishes.id`: cùng một
        // món ở hai Group phải gộp lại (TC-165), cùng lý lẽ SPEC-024 và
        // `eating_history`.
        inArray(groupDishes.globalDishId, [...globalDishIds]),
      ),
    )
    .where(
      sql`${selectionSessions.decisionDate} > coalesce(
        (select ${userPreferenceSettings.implicitResetAt} at time zone 'UTC'
           from ${userPreferenceSettings}
          where ${userPreferenceSettings.userId} = ${userId})::date,
        '-infinity'::date)`,
    )

  return rows
}

export const drizzleSelectionRepository: SelectionRepository = {
  findParticipant,
  listEligibleDishCards,
  findSessionState,
  isDishActiveInSession,
  applyInteraction,
  findMaterializedDeck,
  materializeDeck,
  findSessionForRanking,
  countInteractionsByDish,
  countCannotEatByDish,
  listRankingParticipantUserIds,
  findSessionCourses,
  findImplicitSwipes,
}
