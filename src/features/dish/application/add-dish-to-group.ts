import type { DishDraftError } from '../domain/dish-draft'
import { readDishDraft } from '../domain/dish-draft'
import type { DishRepository, GlobalDishCandidate, GroupDishSummary } from './dish-repository'
import type { ErrorCode, Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

export type AddDishToGroupDeps = {
  readonly dishes: DishRepository
}

export type AddDishToGroupInput = {
  readonly groupId: string
  readonly creatorUserId: string
  readonly name: string
  readonly systemTags: readonly string[]
  readonly forceCreate?: boolean
}

export type AddDishOutcome =
  | { readonly kind: 'added'; readonly dish: GroupDishSummary }
  | { readonly kind: 'candidates'; readonly candidates: GlobalDishCandidate[] }

/** `field` để presentation đặt lỗi NGAY DƯỚI đúng input (Design Criteria §12). */
const FAILURE_FOR: Record<DishDraftError, { code: ErrorCode; field: string; reason: string }> = {
  NAME_EMPTY: { code: 'ERR_VALIDATION', field: 'name', reason: 'Tên món không được để trống' },
  NAME_TOO_LONG: { code: 'ERR_VALIDATION', field: 'name', reason: 'Tên món tối đa 120 ký tự' },
  // TC-021 — mã riêng, KHÔNG gộp vào ERR_VALIDATION.
  INVALID_SYSTEM_TAG: {
    code: 'ERR_INVALID_SYSTEM_TAG',
    field: 'systemTag',
    reason: 'Nhãn hệ thống không hợp lệ',
  },
}

export async function addDishToGroup(
  deps: AddDishToGroupDeps,
  input: AddDishToGroupInput,
): Promise<Result<AddDishOutcome, Failure>> {
  const draft = readDishDraft({ name: input.name, systemTags: input.systemTags })
  if (!draft.ok) {
    const { code, field, reason } = FAILURE_FOR[draft.error]
    return err(failure(code, { field, reason }))
  }

  // 1. Đã có row cho tên này TRONG group này? (TC-020, TC-099)
  const existing = await deps.dishes.findInGroupByNormalizedName(
    input.groupId,
    draft.value.normalizedName,
  )
  if (existing !== null) {
    if (existing.state === 'ACTIVE') {
      return err(failure('ERR_DISH_ALREADY_IN_POOL'))
    }
    // INACTIVE — TC-020: khôi phục, KHÔNG tạo Global Dish mới.
    // Ghi đè toàn bộ tag theo đúng input vừa gửi (kể cả mảng rỗng — Guide §13).
    await deps.dishes.reactivateGroupDish(existing.id)
    await deps.dishes.replaceSystemTags({
      groupDishId: existing.id,
      systemTags: draft.value.systemTags,
    })
    return ok({ kind: 'added', dish: { id: existing.id, name: existing.name } })
  }

  // 2. Chưa có trong group này. Nếu không forceCreate, tra ứng viên TOÀN CỤC theo tên chuẩn hoá (TC-018).
  if (!input.forceCreate) {
    const candidates = await deps.dishes.findGlobalCandidatesByNormalizedName(
      draft.value.normalizedName,
    )
    if (candidates.length > 0) {
      return ok({ kind: 'candidates', candidates })
    }
  }

  // 3. forceCreate=true (TC-019) hoặc không có candidate nào (TC-017) — tạo mới bình thường.
  const dish = await deps.dishes.createGlobalDishAndAddToPool({
    groupId: input.groupId,
    name: draft.value.name,
    normalizedName: draft.value.normalizedName,
    creatorUserId: input.creatorUserId,
    systemTags: draft.value.systemTags,
  })
  return ok({ kind: 'added', dish })
}
