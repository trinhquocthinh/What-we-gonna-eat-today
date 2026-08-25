import type { DishRepository, GroupDishSummary } from './dish-repository'
import type { Failure } from '@/shared/errors'
import type { Result } from '@/shared/result'

export type AddExistingDishToGroupDeps = {
  readonly dishes: DishRepository
}

export type AddExistingDishToGroupInput = {
  readonly groupId: string
  readonly globalDishId: string
}

/**
 * "Dùng món này" trên S-06 (E2-T7 nối dây UI). KHÔNG thuộc hợp đồng SPEC-005
 * (vốn chỉ nhận `name`+`forceCreate`) — xem DEC-023. An toàn để luôn upsert
 * thẳng lên ACTIVE vì một candidate trả về từ `findGlobalCandidatesByNormalizedName`
 * không bao giờ trùng dish đang ACTIVE của group này (xem giải thích ở
 * `add-dish-to-group.ts`).
 */
export async function addExistingDishToGroup(
  deps: AddExistingDishToGroupDeps,
  input: AddExistingDishToGroupInput,
): Promise<Result<GroupDishSummary, Failure>> {
  const dish = await deps.dishes.addExistingGlobalDishToGroup(input)
  return { ok: true, value: dish }
}
