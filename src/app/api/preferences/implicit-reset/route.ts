import { requireApiUser } from '@/app/api/api-auth'
import { resetImplicitPreference } from '@/features/preference/application/reset-implicit-preference'
import { drizzlePreferenceRepository } from '@/features/preference/infrastructure/drizzle-preference-repository'
import { httpStatusForErrorCode } from '@/shared/http-error'

/**
 * SPEC-040 — "Quên sở thích đã học" cho người dùng hiện tại (BR-038, BR-061).
 *
 * **POST chứ không PUT.** Hai Route Handler kia dùng PUT vì chúng đặt một giá
 * trị người gọi tự chọn — gửi lại cùng body cho cùng kết quả. Ở đây mỗi lần bấm
 * dời mốc tới `now()`, nên nó KHÔNG idempotent, và một `PUT` không idempotent
 * là nói dối về động từ.
 *
 * KHÔNG đọc body: `SPEC-040` ghi đầu vào là `{ }`, và `userId` luôn lấy từ
 * phiên đăng nhập — cùng lý lẽ `TC-117`.
 */
/* jscpd:ignore-start */
export async function POST() {
  const auth = await requireApiUser()
  if (!auth.ok) return auth.response

  const result = await resetImplicitPreference(
    { preferences: drizzlePreferenceRepository },
    { userId: auth.user.id },
  )

  if (!result.ok) {
    return Response.json(
      { code: result.error.code, details: result.error.details },
      { status: httpStatusForErrorCode(result.error.code) },
    )
  }

  return Response.json({ implicitResetAt: result.value.implicitResetAt }, { status: 200 })
}
/* jscpd:ignore-end */
