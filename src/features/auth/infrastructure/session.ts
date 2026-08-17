import { cache } from 'react'

import type { AuthenticatedUser } from '../domain/provider-identity'
import { auth } from './auth'

/**
 * Data Access Layer theo khuyến nghị của Next 16 (`02-guides/authentication.md`):
 * mọi chỗ cần biết "ai đang đăng nhập" đi qua đúng hàm này.
 *
 * KHÔNG truy vấn database — mọi thứ cần thiết đã nằm trong JWT. Nếu đọc DB ở
 * đây thì mỗi lần điều hướng đều dính cold start của Neon (R-01, NFR-01).
 *
 * `cache()` của React khử trùng lặp trong một lần render.
 */
export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const session = await auth()

  const id = session?.userId
  if (typeof id !== 'string' || id === '') {
    return null
  }

  return {
    id,
    displayName: session?.user?.name ?? '',
    email: session?.user?.email ?? '',
  }
})
