import { readSystemTags } from '../domain/system-tag'
import type { DishRepository, GroupDishSummary } from './dish-repository'
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

export type AddExistingDishToGroupDeps = {
  readonly dishes: DishRepository
}

export type AddExistingDishToGroupInput = {
  readonly groupId: string
  readonly globalDishId: string
  /** Chuỗi thô từ FormData — validate ở đây, cùng khuôn `addDishToGroup`. */
  readonly systemTags: readonly string[]
}

/**
 * "Dùng món này" trên S-06 (E2-T7 nối dây UI). KHÔNG thuộc hợp đồng SPEC-005
 * (vốn chỉ nhận `name`+`forceCreate`) — xem DEC-023. An toàn để luôn upsert
 * thẳng lên ACTIVE vì một candidate trả về từ `findGlobalCandidatesByNormalizedName`
 * không bao giờ trùng dish đang ACTIVE của group này (xem giải thích ở
 * `add-dish-to-group.ts`).
 *
 * GHI TAG là bắt buộc, không phải tuỳ chọn: bản đầu chỉ nhận
 * `{groupId, globalDishId}` nên tag người dùng vừa tick bị rơi im lặng và món
 * dùng lại luôn hiện ở mục "Chưa phân nhãn". Tag gắn theo Group
 * (`group_dish_tags` khoá theo `group_dish_id`), nên phải ghi SAU khi biết
 * `groupDishId` mà upsert trả về.
 */
export async function addExistingDishToGroup(
  deps: AddExistingDishToGroupDeps,
  input: AddExistingDishToGroupInput,
): Promise<Result<GroupDishSummary, Failure>> {
  const tags = readSystemTags(input.systemTags)
  if (!tags.ok) {
    return err(failure('ERR_INVALID_SYSTEM_TAG', { field: 'systemTag' }))
  }

  const dish = await deps.dishes.addExistingGlobalDishToGroup({
    groupId: input.groupId,
    globalDishId: input.globalDishId,
  })

  await deps.dishes.replaceSystemTags({ groupDishId: dish.id, systemTags: tags.value })

  return ok(dish)
}
