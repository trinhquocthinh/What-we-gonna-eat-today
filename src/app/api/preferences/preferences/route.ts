import { requireApiUser } from '@/app/api/api-auth'
import { setDishPreference } from '@/features/preference/application/set-dish-preference'
import { drizzlePreferenceRepository } from '@/features/preference/infrastructure/drizzle-preference-repository'
import { httpStatusForErrorCode } from '@/shared/http-error'

/**
 * SPEC-025 — Đặt sở thích LIKE / DISLIKE / Neutral (null) cho người dùng hiện tại (BR-037).
 *
 * Route Handler PUT (idempotent), KHÔNG phải Server Action (Tech Spec §4.1, DEC-055):
 * Thao tác này diễn ra trực tiếp ngay trong luồng vuốt và danh mục.
 *
 * userId luôn lấy từ phiên đăng nhập (auth.user.id); bỏ qua bất kỳ trường userId nào trong body.
 */
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

  if (
    typeof globalDishId !== 'string' ||
    globalDishId.trim() === '' ||
    (kind !== 'LIKE' && kind !== 'DISLIKE' && kind !== null)
  ) {
    return Response.json(
      { code: 'ERR_VALIDATION' },
      { status: httpStatusForErrorCode('ERR_VALIDATION') },
    )
  }

  const result = await setDishPreference(
    { preferences: drizzlePreferenceRepository },
    { userId: auth.user.id, globalDishId, kind },
  )

  if (!result.ok) {
    return Response.json(
      { code: result.error.code, details: result.error.details },
      { status: httpStatusForErrorCode(result.error.code) },
    )
  }

  return Response.json({ ok: true }, { status: 200 })
}
