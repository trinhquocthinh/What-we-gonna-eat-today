'use server'

import { signIn, signOut } from '../../infrastructure/auth'

/**
 * Cả hai hàm kết thúc bằng `redirect()` bên trong next-auth, mà `redirect()`
 * hoạt động bằng cách throw — tuyệt đối không bọc `try/catch` quanh chúng.
 */
export async function signInToApp(): Promise<void> {
  // Chuỗi 'google' là MỘT trong hai chỗ duy nhất còn biết tên nhà cung cấp —
  // chỗ kia là `providers: [Google]` trong infrastructure/auth.ts. Chuyển sang
  // Authentik (Family Hub) chỉ cần đổi đúng hai dòng đó cộng biến môi trường;
  // xem Setup & Ops Guide §3.1. Đừng để tên nhà cung cấp rò ra chỗ khác.
  await signIn('google', { redirectTo: '/groups' })
}

export async function signOutFromApp(): Promise<void> {
  await signOut({ redirectTo: '/' })
}
