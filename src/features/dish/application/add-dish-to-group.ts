import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { DishDraftError } from '../domain/dish-draft'
import { readDishDraft } from '../domain/dish-draft'
import type { DishRepository, GroupDishSummary } from './dish-repository'

export type AddDishToGroupDeps = {
  readonly dishes: DishRepository
}

export type AddDishToGroupInput = {
  readonly groupId: string
  readonly creatorUserId: string
  readonly name: string
}

/** `field` để presentation đặt lỗi NGAY DƯỚI đúng input (Design Criteria §12). */
const FAILURE_DETAILS: Record<DishDraftError, { field: string; reason: string }> = {
  NAME_EMPTY: { field: 'name', reason: 'Tên món không được để trống' },
  NAME_TOO_LONG: { field: 'name', reason: 'Tên món tối đa 120 ký tự' },
}

/**
 * SPEC-005 rút gọn — Thêm Dish vào Group Dish Pool.
 *
 * Thứ tự BẤT BIẾN: validate → chặn trùng → ghi. Validate chạy trước khi chạm
 * repository, nên tên rỗng/quá dài không ghi gì; chặn trùng chạy trước khi ghi,
 * nên lỗi trùng cũng không ghi gì (SDD §2.4 — "không để lại thay đổi từng phần").
 *
 * KHÔNG có ở S3, theo Plan & Scope §P1:
 * - `systemTags` + `ERR_INVALID_SYSTEM_TAG`     → E2-T5
 * - `existingCandidates` + `forceCreate`         → E2-T4
 * - nhánh INACTIVE → reactivate                  → E2-T4
 *
 * Ở S3, BẤT KỲ hàng nào tìm thấy đều là `ERR_DISH_ALREADY_IN_POOL`. Hàng
 * INACTIVE không tồn tại được vì gỡ món khỏi pool là F27/v1.1.
 */
export async function addDishToGroup(
  deps: AddDishToGroupDeps,
  input: AddDishToGroupInput,
): Promise<Result<GroupDishSummary, Failure>> {
  const draft = readDishDraft({ name: input.name })

  if (!draft.ok) {
    return err(failure('ERR_VALIDATION', FAILURE_DETAILS[draft.error]))
  }

  const existing = await deps.dishes.findInGroupByNormalizedName(
    input.groupId,
    draft.value.normalizedName,
  )

  if (existing !== null) {
    return err(
      failure('ERR_DISH_ALREADY_IN_POOL', {
        field: 'name',
        groupDishId: existing.id,
        existingName: existing.name,
      }),
    )
  }

  const created = await deps.dishes.createGlobalDishAndAddToPool({
    groupId: input.groupId,
    name: draft.value.name,
    normalizedName: draft.value.normalizedName,
    creatorUserId: input.creatorUserId,
  })

  return ok(created)
}
