import { buildDefaultEatingHistory } from '@/features/history/domain/default-eating-history'
import type { PreferenceRepository } from '@/features/preference/application/preference-repository'
import type { RuleRepository } from '@/features/rule/application/rule-repository'
import { evaluateRules } from '@/features/rule/domain/evaluate'
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { MealRepository } from './meal-repository'

export type FinalizeSessionDeps = {
  readonly meal: MealRepository
  /** `meal → rule` đã nằm sẵn trong `ALLOWED_CROSS_FEATURE` từ E0-T2 —
   *  chiều này được dự trù đúng cho khoảnh khắc này. */
  readonly rules: RuleRepository
  /** `meal → preference` đã nằm trong `ALLOWED_CROSS_FEATURE` từ E7-S1 (E7-T7). */
  readonly preferences: PreferenceRepository
}

export type FinalizeSessionInput = {
  readonly sessionId: string
  readonly userId: string
}

/**
 * SPEC-016 — Finalize. Chạy đủ 7 bước nguyên văn SDD.
 *
 * Bước 7 (tạo Final Meal, chuyển FINALIZED, sinh Eating History "trong cùng
 * transaction") = gọi `commitFinalize` — nguyên tử, xem `meal-repository.ts`.
 */
export async function finalizeSession(
  deps: FinalizeSessionDeps,
  input: FinalizeSessionInput,
): Promise<Result<{ finalMealId: string }, Failure>> {
  /* jscpd:ignore-start */
  // Bước 1: Session ACTIVE.
  const session = await deps.meal.findSessionForMeal(input.sessionId)
  if (session === null || session.state !== 'ACTIVE') {
    return err(failure('ERR_SESSION_NOT_ACTIVE', { sessionId: input.sessionId }))
  }

  // Bước 2: người gọi là Creator.
  if (session.creatorUserId !== input.userId) {
    return err(failure('ERR_NOT_SESSION_CREATOR', { sessionId: input.sessionId }))
  }
  /* jscpd:ignore-end */

  // Bước 3: nháp không rỗng.
  const draft = await deps.meal.getDraft(input.sessionId)
  if (draft === null || draft.groupDishIds.length === 0) {
    return err(failure('ERR_EMPTY_FINAL_MEAL', { sessionId: input.sessionId }))
  }

  // Bước 4: revalidate mọi Dish vẫn Active TẠI THỜI ĐIỂM NÀY — có thể đã đổi
  // kể từ lúc lưu nháp (TC-069: Admin gỡ Dish sau khi Creator đã chọn).
  const inactiveDishIds = await deps.meal.findInactiveDishIds(input.sessionId, draft.groupDishIds)
  if (inactiveDishIds.length > 0) {
    return err(failure('ERR_DISH_NOT_IN_POOL', { groupDishIds: inactiveDishIds }))
  }

  // Bước 5 — Session Rule ĐÃ SNAPSHOT lúc Start (TC-074). KHÔNG đọc
  // `group_rules`: Admin đổi quy định sau khi phiên chạy không được đổi luật
  // của phiên đang chạy (BR-015).
  const rules = await deps.rules.listSessionRules(input.sessionId)

  // Bước 6 — System Tag HIỆN TẠI của món (TC-075, BR-052). KHÁC bước 5 về
  // thời điểm một cách CÓ CHỦ Ý: "nhà này đòi mâm cơm có gì" đã chốt lúc Start;
  // "món này là món gì" thì sự thật mới nhất là sự thật đúng.
  const tagsByDish = await deps.meal.findSystemTagsByGroupDish(draft.groupDishIds)
  const evaluation = evaluateRules({
    rules,
    dishes: draft.groupDishIds.map((groupDishId) => ({
      systemTags: tagsByDish.get(groupDishId) ?? [],
    })),
    targetDishCount: session.targetDishCount ?? null,
  })
  if (evaluation.blocking.length > 0) {
    // TC-072 — phiên GIỮ NGUYÊN `ACTIVE`. Không có lệnh ghi nào đã chạy tới
    // đây, nên "giữ nguyên" là hệ quả của thứ tự bước, không phải của một lệnh
    // rollback nào.
    return err(
      failure('ERR_REQUIRED_RULE_FAILED', {
        sessionId: input.sessionId,
        // E5-T9 in "Còn thiếu: 1 món canh" ngay trên nút chốt — chi tiết phải
        // đi kèm mã lỗi, không phải để presentation tự tra lại.
        shortfalls: evaluation.blocking,
      }),
    )
  }

  // Bước 7 — chuẩn bị dữ liệu TRƯỚC transaction, đúng nguyên tắc "đọc trước,
  // ghi nguyên tử sau" đã dùng xuyên suốt S2-S5.
  const [participantUserIds, globalDishIdByGroupDishId] = await Promise.all([
    deps.meal.listActiveParticipantUserIds(input.sessionId),
    deps.meal.resolveGlobalDishIds(draft.groupDishIds),
  ])
  const globalDishIds = draft.groupDishIds
    .map((id) => globalDishIdByGroupDishId.get(id))
    .filter((id): id is string => id !== undefined)

  const participantConstraints = await Promise.all(
    participantUserIds.map(async (userId) => {
      const constrainedDishIds = await deps.preferences.findConstrainedGlobalDishIds(userId)
      return { userId, constrainedDishIds }
    }),
  )

  const cannotEatPairs = new Set<string>()
  for (const { userId, constrainedDishIds } of participantConstraints) {
    for (const globalDishId of constrainedDishIds) {
      cannotEatPairs.add(`${userId}:${globalDishId}`)
    }
  }

  const eatingHistoryRows = buildDefaultEatingHistory({
    participantUserIds,
    globalDishIds,
    decisionDate: session.decisionDate,
    finalMealId: draft.finalMealId,
    cannotEatPairs,
  })

  await deps.meal.commitFinalize({ sessionId: input.sessionId, eatingHistoryRows })

  return ok({ finalMealId: draft.finalMealId })
}
