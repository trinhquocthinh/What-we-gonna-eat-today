import { requireApiUser } from '@/app/api/api-auth'
import { setDishConstraint } from '@/features/preference/application/set-dish-constraint'
import { drizzlePreferenceRepository } from '@/features/preference/infrastructure/drizzle-preference-repository'
import { httpStatusForErrorCode } from '@/shared/http-error'

/**
 * SPEC-024 / SPEC-038 / SPEC-039 — bật/tắt MỘT trong ba cờ cá nhân cho người
 * dùng hiện tại (BR-034, BR-035, BR-036).
 *
 * Route Handler PUT (idempotent), KHÔNG phải Server Action (Tech Spec §4.1, DEC-055):
 * Thao tác này diễn ra trực tiếp ngay trong luồng vuốt và danh mục.
 *
 * TC-117 (§1.4): userId trong body (nếu client gửi kèm) bị bỏ qua;
 * ràng buộc luôn ghi cho người đang đăng nhập (auth.user.id).
 *
 * E13-T6 đổi hình dạng body từ `{ globalDishId, cannotEat }` sang
 * `{ globalDishId, kind, enabled }` — breaking change có chủ ý. Client duy nhất
 * là `DishPreferenceControls`, sửa cùng slice. Nuôi hai hình dạng song song là
 * nuôi hai đường ghi phải giữ đồng bộ bằng tay, đúng thứ SDD §10 vừa dạy.
 */
/* jscpd:ignore-start */
export async function PUT(request: Request) {
  const auth = await requireApiUser()
  if (!auth.ok) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { code: 'ERR_VALIDATION' },
      { status: httpStatusForErrorCode('ERR_VALIDATION') },
    )
  }

  const globalDishId =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)['globalDishId']
      : undefined
  const kind =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)['kind']
      : undefined
  const enabled =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)['enabled']
      : undefined

  if (
    typeof globalDishId !== 'string' ||
    globalDishId.trim() === '' ||
    (kind !== 'CANNOT_EAT' && kind !== 'BLACKLIST' && kind !== 'HISTORY_WHITELIST') ||
    typeof enabled !== 'boolean'
  ) {
    return Response.json(
      { code: 'ERR_VALIDATION' },
      { status: httpStatusForErrorCode('ERR_VALIDATION') },
    )
  }

  const result = await setDishConstraint(
    { preferences: drizzlePreferenceRepository },
    { userId: auth.user.id, globalDishId, kind, enabled },
  )

  if (!result.ok) {
    return Response.json(
      { code: result.error.code, details: result.error.details },
      { status: httpStatusForErrorCode(result.error.code) },
    )
  }

  return Response.json({ removedInteraction: result.value.removedInteraction }, { status: 200 })
}
/* jscpd:ignore-end */
