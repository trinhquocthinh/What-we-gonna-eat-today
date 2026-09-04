import { requireApiUser } from '@/app/api/api-auth'
import { setDishConstraint } from '@/features/preference/application/set-dish-constraint'
import { drizzlePreferenceRepository } from '@/features/preference/infrastructure/drizzle-preference-repository'
import { httpStatusForErrorCode } from '@/shared/http-error'

/**
 * SPEC-024 — Bật/tắt ràng buộc Cannot Eat cho người dùng hiện tại (BR-034).
 *
 * Route Handler PUT (idempotent), KHÔNG phải Server Action (Tech Spec §4.1, DEC-055):
 * Thao tác này diễn ra trực tiếp ngay trong luồng vuốt và danh mục.
 *
 * TC-117 (§1.4): userId trong body (nếu client gửi kèm) bị bỏ qua;
 * ràng buộc luôn ghi cho người đang đăng nhập (auth.user.id).
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
  const cannotEat =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)['cannotEat']
      : undefined

  if (
    typeof globalDishId !== 'string' ||
    globalDishId.trim() === '' ||
    typeof cannotEat !== 'boolean'
  ) {
    return Response.json(
      { code: 'ERR_VALIDATION' },
      { status: httpStatusForErrorCode('ERR_VALIDATION') },
    )
  }

  const result = await setDishConstraint(
    { preferences: drizzlePreferenceRepository },
    { userId: auth.user.id, globalDishId, cannotEat },
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
