import type { AuthenticatedUser } from '@/features/auth/domain/provider-identity'
import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { httpStatusForErrorCode } from '@/shared/http-error'

/**
 * Cửa vào của MỌI Route Handler: hoặc trả về user, hoặc trả về đúng phản hồi
 * 401 dạng JSON để handler `return` thẳng.
 *
 * Đặt ở `app/` cùng lý do `groups/[groupId]/group-access.ts` đặt ở đó: đây là
 * chỗ lắp ráp cross-feature, mà `shared/` thì không được phép import `features/`.
 *
 * KHÔNG dùng `notFound()`/`redirect()` như guard của trang: chúng trả HTML, vô
 * nghĩa với một endpoint JSON.
 *
 * Trả về union thay vì ném: handler đọc `.ok` rồi `return result.response` —
 * `tsc` bắt được nếu ai quên nhánh lỗi, còn ném thì không.
 */
export type ApiUserResult =
  | { readonly ok: true; readonly user: AuthenticatedUser }
  | { readonly ok: false; readonly response: Response }

export async function requireApiUser(): Promise<ApiUserResult> {
  const user = await getCurrentUser()

  if (user === null) {
    return {
      ok: false,
      response: Response.json(
        { code: 'ERR_UNAUTHENTICATED' },
        { status: httpStatusForErrorCode('ERR_UNAUTHENTICATED') },
      ),
    }
  }

  return { ok: true, user }
}
