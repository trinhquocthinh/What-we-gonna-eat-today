import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { DishRepository } from './dish-repository'

export type RemoveDishFromGroupDeps = {
  readonly dishes: DishRepository
  /** Truyền từ `app/` — `features/dish` không được import `features/group`
   *  (`eslint.config.mjs` → `ALLOWED_CROSS_FEATURE`). */
  readonly assertAdmin: (input: {
    readonly userId: string
    readonly groupId: string
  }) => Promise<Result<void, Failure>>
}

export type RemoveDishFromGroupInput = {
  readonly groupId: string
  readonly groupDishId: string
  readonly requestedByUserId: string
}

/**
 * BR-005 / SPEC-035 — gỡ món khỏi danh mục nhóm.
 *
 * Thứ tự BẤT BIẾN: quyền → tồn tại & đang ACTIVE → ghi.
 * KHÔNG xoá dòng trong `group_dishes`, KHÔNG đụng `group_dish_tags` (DEC-009, DEC-053).
 */
export async function removeDishFromGroup(
  deps: RemoveDishFromGroupDeps,
  input: RemoveDishFromGroupInput,
): Promise<Result<void, Failure>> {
  // 1. Quyền Admin
  const access = await deps.assertAdmin({
    userId: input.requestedByUserId,
    groupId: input.groupId,
  })
  if (!access.ok) {
    return access
  }

  /* jscpd:ignore-start */
  // 2. Tồn tại và đang ACTIVE trong đúng Group này (phòng ngừa Group A gỡ món của Group B)
  const dish = await deps.dishes.findActiveGroupDish({
    groupId: input.groupId,
    groupDishId: input.groupDishId,
  })
  if (dish === null) {
    return err(failure('ERR_DISH_NOT_IN_POOL', { groupDishId: input.groupDishId }))
  }
  /* jscpd:ignore-end */

  // 3. Đánh dấu INACTIVE
  await deps.dishes.deactivateGroupDish(dish.id)

  return ok(undefined)
}
