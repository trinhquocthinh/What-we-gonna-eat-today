import { and, eq, inArray } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import {
  eatingHistory,
  finalMealItems,
  finalMeals,
  groupDishes,
  participants,
  selectionSessions,
} from '@/shared/db/schema'

import type { MealRepository, SessionForMeal } from '../application/meal-repository'

async function findSessionForMeal(sessionId: string): Promise<SessionForMeal | null> {
  const rows = await getDb()
    .select({
      id: selectionSessions.id,
      creatorUserId: selectionSessions.creatorUserId,
      state: selectionSessions.state,
      decisionDate: selectionSessions.decisionDate,
      groupId: selectionSessions.groupId,
    })
    .from(selectionSessions)
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
}): Promise<void> {
  const db = getDb()

  const updateSession = db
    .update(selectionSessions)
    .set({ state: 'FINALIZED', finalizedAt: new Date() })
    .where(and(eq(selectionSessions.id, input.sessionId), eq(selectionSessions.state, 'ACTIVE')))

  if (input.eatingHistoryRows.length === 0) {
    // `db.batch` cần tuple ≥1 phần tử — nháp có thể hợp lệ với 0 Participant
    // (lý thuyết: Session không có Participant nào ngoài Creator đã bị remove
    // — hiếm nhưng không phải bất khả). Chỉ UPDATE, không batch.
    await updateSession
    return
  }

  await db.batch([
    updateSession,
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
  ])
}

export const drizzleMealRepository: MealRepository = {
  findSessionForMeal,
  findInactiveDishIds,
  saveDraft,
  getDraft,
  listActiveParticipantUserIds,
  resolveGlobalDishIds,
  commitFinalize,
}
