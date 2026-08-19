import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { readSystemTags } from '../domain/system-tag'
import type { DishRepository, GroupDishSummary } from './dish-repository'

export type SetSystemTagsDeps = {
  readonly dishes: DishRepository
  /** Truyền từ `app/` — `features/dish` không được import `features/group`
   *  (`eslint.config.mjs` → `ALLOWED_CROSS_FEATURE`). Cùng lý do khiến
   *  `requireGroupContext` phải sống ở `app/groups/[groupId]/group-access.ts`. */
  readonly assertAdmin: (input: {
    readonly userId: string
    readonly groupId: string
  }) => Promise<Result<void, Failure>>
}

export type SetSystemTagsInput = {
  readonly groupId: string
  /** `group_dishes.id` — KHÔNG phải `global_dishes.id`. Tag gắn theo Group. */
  readonly groupDishId: string
  readonly systemTags: readonly string[]
  readonly requestedByUserId: string
}

/**
 * SPEC-006 — ghi đè toàn bộ tag của một món TRONG một Group.
 *
 * Thứ tự BẤT BIẾN: quyền → validate → tồn tại → ghi. Ba vòng kiểm đầu không
 * chạm gì tới dữ liệu, nên mọi nhánh lỗi đều không để lại thay đổi từng phần
 * (SDD §2.4).
 */
export async function setSystemTags(
  deps: SetSystemTagsDeps,
  input: SetSystemTagsInput,
): Promise<Result<GroupDishSummary, Failure>> {
  // TC-025 — BR-008: chỉ Group Admin mới chỉnh System Tag.
  const access = await deps.assertAdmin({
    userId: input.requestedByUserId,
    groupId: input.groupId,
  })
  if (!access.ok) {
    return access
  }

  // TC-021 / TC-100 / TC-101 — khử trùng lặp và chuẩn hoá thứ tự nằm ở đây.
  const systemTags = readSystemTags(input.systemTags)
  if (!systemTags.ok) {
    return err(failure('ERR_INVALID_SYSTEM_TAG', { field: 'systemTags' }))
  }

  const dish = await deps.dishes.findActiveGroupDish({
    groupId: input.groupId,
    groupDishId: input.groupDishId,
  })
  if (dish === null) {
    return err(failure('ERR_DISH_NOT_IN_POOL', { groupDishId: input.groupDishId }))
  }

  // TC-022 / TC-023 — ghi đè, không cộng dồn. Mảng rỗng xoá sạch.
  await deps.dishes.replaceSystemTags({ groupDishId: dish.id, systemTags: systemTags.value })

  return ok(dish)
}
