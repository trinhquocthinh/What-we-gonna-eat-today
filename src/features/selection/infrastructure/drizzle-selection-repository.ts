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
  sessionDecks,
  userDishConstraints,
} from '@/shared/db/schema'
import { toSystemTags, type SystemTag } from '@/shared/domain/system-tag'

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
    })
    .from(groupDishes)
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .innerJoin(selectionSessions, eq(selectionSessions.groupId, groupDishes.groupId))
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
        // BR-034 — Stage 1 Hard Filter. Lọc ở SQL chứ không ở tầng trên: LIMIT
        // và phân trang chạy SAU phép lọc, cùng lý lẽ DEC-055 mục 3.
        notExists(
          getDb()
            .select({ one: sql`1` })
            .from(userDishConstraints)
            .where(
              and(
                eq(userDishConstraints.userId, userId),
                eq(userDishConstraints.globalDishId, globalDishes.id),
              ),
            ),
        ),
      ),
    )
    .orderBy(groupDishes.id)

  return rows.map((row) => ({
    dishId: row.dishId,
    globalDishId: row.globalDishId,
    name: row.name,
    systemTags: [],
    effectiveInteraction: row.effectiveType,
    daysSinceLastEaten: null,
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
  listRankingParticipantUserIds,
}
