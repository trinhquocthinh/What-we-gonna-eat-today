import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { signOutFromApp } from '@/features/auth/presentation/containers/auth-actions'
import { Button } from '@/shared/ui/button'

// TẠM. E1-T2 thay ruột bằng S-02 Danh sách nhóm. Ở đây chỉ đủ để chứng minh
// cookie phiên chạy thật trên preview — điều kiện "xong" của E1-T1.
export default async function GroupsPage() {
  const user = await getCurrentUser()
  if (user === null) {
    redirect('/')
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col justify-between px-6 pb-8 pt-8">
      <div className="flex flex-col gap-2">
        <span className="text-caption font-medium uppercase tracking-eyebrow text-accent">
          Đã đăng nhập
        </span>
        <h1 className="text-title font-semibold text-ink">{user.displayName}</h1>
        <p className="text-body font-normal text-ink-muted">{user.email}</p>
      </div>

      <form action={signOutFromApp}>
        <Button variant="secondary" type="submit">
          Đăng xuất
        </Button>
      </form>
    </main>
  )
}
