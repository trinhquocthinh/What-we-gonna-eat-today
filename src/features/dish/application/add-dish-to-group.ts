import { readDishDraft } from '../domain/dish-draft'
import type { DishRepository, GlobalDishCandidate, GroupDishSummary } from './dish-repository'
import { failure, type Failure } from '@/shared/errors'
import type { Result } from '@/shared/result'

export type AddDishToGroupDeps = {
  readonly dishes: DishRepository
}

export type AddDishToGroupInput = {
  readonly groupId: string
  readonly creatorUserId: string
  readonly name: string
  readonly forceCreate?: boolean
}

export type AddDishOutcome =
  | { readonly kind: 'added'; readonly dish: GroupDishSummary }
  | { readonly kind: 'candidates'; readonly candidates: GlobalDishCandidate[] }

export async function addDishToGroup(
  deps: AddDishToGroupDeps,
  input: AddDishToGroupInput,
): Promise<Result<AddDishOutcome, Failure>> {
  const draft = readDishDraft({ name: input.name })
  if (!draft.ok) {
    return { ok: false, error: failure('ERR_VALIDATION', { field: 'name' }) }
  }

  // 1. Đã có row cho tên này TRONG group này? (TC-020, TC-099)
  const existing = await deps.dishes.findInGroupByNormalizedName(
    input.groupId,
    draft.value.normalizedName,
  )
  if (existing !== null) {
    if (existing.state === 'ACTIVE') {
      return { ok: false, error: failure('ERR_DISH_ALREADY_IN_POOL') }
    }
    // INACTIVE — TC-020: khôi phục, KHÔNG tạo Global Dish mới.
    await deps.dishes.reactivateGroupDish(existing.id)
    return { ok: true, value: { kind: 'added', dish: { id: existing.id, name: existing.name } } }
  }

  // 2. Chưa có trong group này. Nếu không forceCreate, tra ứng viên TOÀN CỤC theo tên chuẩn hoá (TC-018).
  if (!input.forceCreate) {
    const candidates = await deps.dishes.findGlobalCandidatesByNormalizedName(
      draft.value.normalizedName,
    )
    if (candidates.length > 0) {
      return { ok: true, value: { kind: 'candidates', candidates } }
    }
  }

  // 3. forceCreate=true (TC-019) hoặc không có candidate nào (TC-017) — tạo mới bình thường.
  const dish = await deps.dishes.createGlobalDishAndAddToPool({
    groupId: input.groupId,
    name: draft.value.name,
    normalizedName: draft.value.normalizedName,
    creatorUserId: input.creatorUserId,
  })
  return { ok: true, value: { kind: 'added', dish } }
}
