import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { Banner } from '@/shared/ui/banner'

import { joinAction } from './actions'

type JoinPageProps = {
  params: Promise<{ token: string }>
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params
  const user = await getCurrentUser()
  if (user === null) {
    redirect(`/?joinToken=${encodeURIComponent(token)}`)
  }

  const result = await joinAction(token, user.id)

  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col justify-center px-4 py-8">
        <div className="flex flex-col items-center gap-6 rounded-card border border-border bg-surface-raised p-6 text-center shadow-card">
          <h1 className="text-title font-semibold text-ink">Tham gia nhóm</h1>
          <Banner tone="danger">{result.message}</Banner>
          <Link
            href="/groups"
            className="flex min-h-14 w-full items-center justify-center rounded-control bg-accent px-6 text-subtitle font-semibold text-on-accent shadow-button transition-transform duration-100 hover:bg-accent-hover active:scale-[0.98] active:bg-accent-active"
          >
            Về danh sách nhóm
          </Link>
        </div>
      </main>
    )
  }

  redirect(`/groups/${result.groupId}`)
}
