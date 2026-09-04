import { and, eq, inArray, ne } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import {
  eatingHistory,
  finalizeWarnings,
  finalMealItems,
  finalMeals,
  globalDishes,
  groupDishes,
  groupDishTags,
  groups,
  participants,
  selectionSessions,
  users,
} from '@/shared/db/schema'
import { SYSTEM_TAGS, type SystemTag } from '@/shared/domain/system-tag'

import type { FinalMealView, MealRepository, SessionForMeal } from '../application/meal-repository'

const TAG_ORDER = new Map<SystemTag, number>(SYSTEM_TAGS.map((tag, index) => [tag, index]))

async function findSystemTagsByGroupDish(
  groupDishIds: readonly string[],
): Promise<Map<string, SystemTag[]>> {
  if (groupDishIds.length === 0) return new Map()

  const rows = await getDb()
    .select({
      groupDishId: groupDishTags.groupDishId,
      systemTag: groupDishTags.systemTag,
    })
    .from(groupDishTags)
    .where(inArray(groupDishTags.groupDishId, [...groupDishIds]))

  const map = new Map<string, SystemTag[]>()
  for (const row of rows) {
    const list = map.get(row.groupDishId)
    if (list !== undefined) {
      list.push(row.systemTag)
    } else {
      map.set(row.groupDishId, [row.systemTag])
    }
  }

  for (const list of map.values()) {
    list.sort((a, b) => (TAG_ORDER.get(a) ?? 0) - (TAG_ORDER.get(b) ?? 0))
  }

  return map
}

async function findSessionForMeal(sessionId: string): Promise<SessionForMeal | null> {
  const rows = await getDb()
    .select({
      id: selectionSessions.id,
      creatorUserId: selectionSessions.creatorUserId,
      state: selectionSessions.state,
      decisionDate: selectionSessions.decisionDate,
      groupId: selectionSessions.groupId,
      targetDishCount: selectionSessions.targetDishCount,
      groupTimeZone: groups.timezone,
    })
    .from(selectionSessions)
    .innerJoin(groups, eq(groups.id, selectionSessions.groupId))
    .where(eq(selectionSessions.id, sessionId))
    .limit(1)

  return rows[0] ?? null
}

/* jscpd:ignore-start */
/**
 * `groupId` tự resolve từ `sessionId` — giữ chữ ký use case gọn (không phải
 * đọc `SessionForMeal.groupId` rồi truyền tay qua hai tầng).
 */
async function findInactiveDishIds(
  sessionId: string,
  groupDishIds: readonly string[],
): Promise<string[]> {
  if (groupDishIds.length === 0) return []

  const rows = await getDb()
    .select({ id: groupDishes.id })
    .from(groupDishes)
    .innerJoin(selectionSessions, eq(selectionSessions.groupId, groupDishes.groupId))
    .where(
      and(
        eq(selectionSessions.id, sessionId),
        inArray(groupDishes.id, [...groupDishIds]),
        eq(groupDishes.state, 'ACTIVE'),
      ),
    )

  const activeIds = new Set(rows.map((row) => row.id))
  return groupDishIds.filter((id) => !activeIds.has(id))
}
/* jscpd:ignore-end */

/**
 * SPEC-015 — upsert `final_meals` rồi GHI ĐÈ `final_meal_items`. Ba bước:
 * (1) đọc `final_meals` hiện có (nếu có) để biết `finalMealId` đúng — KHÔNG
 * đoán id mới nếu đã tồn tại; (2) nếu chưa có, tạo mới; (3) xoá hết item cũ
 * rồi chèn lại toàn bộ — "ghi đè, không cộng dồn" (SPEC-015).
 *
 * DELETE + INSERT không cần `db.batch()`: không có bước nào phụ thuộc kết
 * quả của bước trước trong CÙNG một request — nếu muốn tuyệt đối an toàn
 * trước request chồng chéo, xem ghi chú rủi ro §11.
 */
async function saveDraft(
  sessionId: string,
  groupDishIds: readonly string[],
): Promise<{ finalMealId: string }> {
  const db = getDb()

  const existing = await db
    .select({ id: finalMeals.id })
    .from(finalMeals)
    .where(eq(finalMeals.sessionId, sessionId))
    .limit(1)

  const finalMealId = existing[0]?.id ?? uuidv7()

  if (existing[0] === undefined) {
    await db.insert(finalMeals).values({ id: finalMealId, sessionId })
  }

  await db.delete(finalMealItems).where(eq(finalMealItems.finalMealId, finalMealId))

  if (groupDishIds.length > 0) {
    await db
      .insert(finalMealItems)
      .values(groupDishIds.map((groupDishId) => ({ finalMealId, groupDishId })))
  }

  return { finalMealId }
}

async function getDraft(
  sessionId: string,
): Promise<{ finalMealId: string; groupDishIds: string[] } | null> {
  const meal = await getDb()
    .select({ id: finalMeals.id })
    .from(finalMeals)
    .where(eq(finalMeals.sessionId, sessionId))
    .limit(1)

  const finalMealRow = meal[0]
  if (finalMealRow === undefined) return null

  const items = await getDb()
    .select({ groupDishId: finalMealItems.groupDishId })
    .from(finalMealItems)
    .where(eq(finalMealItems.finalMealId, finalMealRow.id))

  return { finalMealId: finalMealRow.id, groupDishIds: items.map((item) => item.groupDishId) }
}

/* jscpd:ignore-start */
/** ACTIVE hoặc COMPLETED — REMOVED bị loại (BR-026: Interaction của Participant
 *  bị remove không được tính, và tương tự không nhận Default Eating History). */
async function listActiveParticipantUserIds(sessionId: string): Promise<string[]> {
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
/* jscpd:ignore-end */

async function resolveGlobalDishIds(groupDishIds: readonly string[]): Promise<Map<string, string>> {
  if (groupDishIds.length === 0) return new Map()

  const rows = await getDb()
    .select({ groupDishId: groupDishes.id, globalDishId: groupDishes.globalDishId })
    .from(groupDishes)
    .where(inArray(groupDishes.id, [...groupDishIds]))

  return new Map(rows.map((row) => [row.groupDishId, row.globalDishId]))
}

/**
 * NGUYÊN TỬ — `db.batch()` của neon-http LÀ transaction Postgres thật (đã
 * verify từ S2, isolation level thật — xem Implementation Guide §1.1). Đây
 * là hàm mà TC-109 gọi TRỰC TIẾP với `eatingHistoryRows` cố ý sai để ép lỗi
 * và kiểm rollback — KHÔNG tự validate gì, tin tưởng hoàn toàn vào caller
 * (`finalizeSession` ở application, hoặc test tầng I).
 */
async function commitFinalize(input: {
  sessionId: string
  eatingHistoryRows: readonly {
    userId: string
    globalDishId: string
    eatingDate: string
    sourceFinalMealId: string
  }[]
  warningRows: readonly {
    kind: 'PREFERRED_SHORTFALL' | 'TARGET_COUNT'
    systemTag: SystemTag | null
    expected: number
    actual: number
  }[]
}): Promise<void> {
  const db = getDb()

  const updateSession = db
    .update(selectionSessions)
    .set({ state: 'FINALIZED', finalizedAt: new Date() })
    .where(and(eq(selectionSessions.id, input.sessionId), eq(selectionSessions.state, 'ACTIVE')))

  const batchStatements: Array<Parameters<typeof db.batch>[0][number]> = [updateSession]

  if (input.eatingHistoryRows.length > 0) {
    batchStatements.push(
      db
        .insert(eatingHistory)
        .values(
          input.eatingHistoryRows.map((row) => ({
            id: uuidv7(),
            userId: row.userId,
            globalDishId: row.globalDishId,
            eatingDate: row.eatingDate,
            sourceFinalMealId: row.sourceFinalMealId,
          })),
        )
        // TC-077 — idempotent theo `finalMealId`: gọi lại với cùng dữ liệu
        // KHÔNG nhân đôi. Đây là cơ chế graceful cho trùng lặp HỢP LỆ; TC-109
        // ép lỗi bằng vi phạm KHOÁ NGOẠI (global_dish_id không tồn tại), một
        // loại lỗi mà onConflictDoNothing không xử lý — batch vẫn thất bại
        // thật ở tình huống đó.
        .onConflictDoNothing({
          target: [
            eatingHistory.userId,
            eatingHistory.globalDishId,
            eatingHistory.eatingDate,
            eatingHistory.sourceFinalMealId,
          ],
        }),
    )
  }

  if (input.warningRows.length > 0) {
    batchStatements.push(
      db.insert(finalizeWarnings).values(
        input.warningRows.map((row) => ({
          sessionId: input.sessionId,
          kind: row.kind,
          systemTag: row.systemTag,
          expected: row.expected,
          actual: row.actual,
        })),
      ),
    )
  }

  if (batchStatements.length === 1) {
    // `db.batch` cần tuple ≥1 phần tử ngoài updateSession — nếu không có row
    // nào cần insert, chỉ UPDATE, không batch.
    await updateSession
    return
  }

  await db.batch(
    batchStatements as unknown as readonly [
      Parameters<typeof db.batch>[0][number],
      ...Parameters<typeof db.batch>[0][number][],
    ],
  )
}

async function findFinalMeal(sessionId: string): Promise<FinalMealView | null> {
  const db = getDb()

  const sessionRows = await db
    .select({
      decisionDate: selectionSessions.decisionDate,
      finalizedAt: selectionSessions.finalizedAt,
      finalizedByDisplayName: users.displayName,
    })
    .from(selectionSessions)
    .innerJoin(users, eq(users.id, selectionSessions.creatorUserId))
    .where(and(eq(selectionSessions.id, sessionId), eq(selectionSessions.state, 'FINALIZED')))
    .limit(1)

  const session = sessionRows[0]
  if (session === undefined || session.finalizedAt === null) {
    return null
  }

  const dishRows = await db
    .select({ groupDishId: finalMealItems.groupDishId, name: globalDishes.name })
    .from(finalMealItems)
    .innerJoin(finalMeals, eq(finalMeals.id, finalMealItems.finalMealId))
    .innerJoin(groupDishes, eq(groupDishes.id, finalMealItems.groupDishId))
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .where(eq(finalMeals.sessionId, sessionId))
    .orderBy(globalDishes.name)

  const tagsByDish = await findSystemTagsByGroupDish(dishRows.map((row) => row.groupDishId))

  const participantRows = await db
    .select({ displayName: users.displayName })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .where(and(eq(participants.sessionId, sessionId), ne(participants.state, 'REMOVED')))

  return {
    decisionDate: session.decisionDate,
    finalizedAt: session.finalizedAt,
    finalizedByDisplayName: session.finalizedByDisplayName,
    dishes: dishRows.map((row) => ({
      ...row,
      systemTags: tagsByDish.get(row.groupDishId) ?? [],
    })),
    participantNames: participantRows.map((row) => row.displayName),
  }
}

export const drizzleMealRepository: MealRepository = {
  findSessionForMeal,
  findInactiveDishIds,
  findSystemTagsByGroupDish,
  saveDraft,
  getDraft,
  listActiveParticipantUserIds,
  resolveGlobalDishIds,
  commitFinalize,
  findFinalMeal,
}
