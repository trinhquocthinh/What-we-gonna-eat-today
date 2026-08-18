import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { LoginScreen } from '@/features/auth/presentation/components/login-screen'
import { signInToApp } from '@/features/auth/presentation/containers/auth-actions'

// Kiểu khai thủ công, KHÔNG dùng helper `PageProps` — helper đó do `next typegen`
// sinh vào `.next/types`, mà CI chạy `yarn typecheck` trước `yarn build`.
type HomePageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const user = await getCurrentUser()
  if (user !== null) {
    redirect('/groups')
  }

  // Auth.js đẩy về `pages.error` kèm `?error=…` khi callback OAuth hỏng.
  const { error } = await searchParams

  return <LoginScreen hasError={error !== undefined} signInAction={signInToApp} />
}
