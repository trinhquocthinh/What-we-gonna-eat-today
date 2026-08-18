import { and, eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import {
  globalDishes,
  groupDishes,
  interactionEvents,
  interactions,
  participants,
  selectionSessions,
} from '@/shared/db/schema'

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
 * Bản dưới đây là bản SAU E1-T9 (có LEFT JOIN `interactions`). Nếu bạn code
 * E1-T8 trước khi bảng `interactions` tồn tại, tạm bỏ khối JOIN + tham số
 * `participantId` không dùng tới, và trả `effectiveInteraction: null` cứng —
 * rồi quay lại sửa đúng hàm này khi tới E1-T9, đừng tạo hàm thứ hai.
 */
async function listEligibleDishCards(
  sessionId: string,
  participantId: string,
): Promise<DishCard[]> {
  const rows = await getDb()
    .select({
      dishId: groupDishes.id,
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
    .where(and(eq(selectionSessions.id, sessionId), eq(groupDishes.state, 'ACTIVE')))
    .orderBy(groupDishes.id)

  // `systemTags` luôn rỗng ở S5 — `group_dish_tags` là E2-T5, chưa tồn tại.
  return rows.map((row) => ({
    dishId: row.dishId,
    name: row.name,
    systemTags: [],
    effectiveInteraction: row.effectiveType,
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
}): Promise<InteractionType | null> {
  const db = getDb()

  if (input.action === 'UNDO') {
    // `db.batch([...])` của neon-http LÀ transaction thật (verify ở S2/S3/S4).
    // DELETE khớp 0 dòng (chưa từng có interaction) KHÔNG phải lỗi — TC-051
    // dựa đúng vào việc này.
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

  await db.batch([
    db
      .insert(interactions)
      .values({
        id: uuidv7(),
        sessionId: input.sessionId,
        participantId: input.participantId,
        groupDishId: input.groupDishId,
        type,
      })
      .onConflictDoUpdate({
        target: [interactions.sessionId, interactions.participantId, interactions.groupDishId],
        set: { type, updatedAt: new Date() },
      }),
    db.insert(interactionEvents).values({
      id: uuidv7(),
      sessionId: input.sessionId,
      participantId: input.participantId,
      groupDishId: input.groupDishId,
      action: input.action,
    }),
  ])

  return type
}

export const drizzleSelectionRepository: SelectionRepository = {
  findParticipant,
  listEligibleDishCards,
  findSessionState,
  isDishActiveInSession,
  applyInteraction,
}
