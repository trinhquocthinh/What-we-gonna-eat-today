'use server'

import { signIn, signOut } from '../../infrastructure/auth'

/**
 * Cả hai hàm kết thúc bằng `redirect()` bên trong next-auth, mà `redirect()`
 * hoạt động bằng cách throw — tuyệt đối không bọc `try/catch` quanh chúng.
 */
export async function signInWithGoogle(): Promise<void> {
  await signIn('google', { redirectTo: '/groups' })
}

export async function signOutFromApp(): Promise<void> {
  await signOut({ redirectTo: '/' })
}
