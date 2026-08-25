'use client'

import Link from 'next/link'
import type { ReactElement } from 'react'
import { useActionState, useState } from 'react'

import { Banner } from '@/shared/ui/banner'
import { Button } from '@/shared/ui/button'

export type InviteFormState = {
  readonly token: string | null
  readonly expiresAt: string | null
  readonly error: string | null
}

export type InviteScreenProps = {
  readonly groupId: string
  readonly groupName: string
  readonly action: (state: InviteFormState, formData: FormData) => Promise<InviteFormState>
}

export function InviteScreen({ groupId, groupName, action }: InviteScreenProps): ReactElement {
  const [state, formAction, pending] = useActionState(action, {
    token: null,
    expiresAt: null,
    error: null,
  })
  const [copied, setCopied] = useState(false)

  const inviteUrl =
    state.token === null
      ? null
      : typeof window !== 'undefined'
        ? `${window.location.origin}/join/${state.token}`
        : `/join/${state.token}`

  async function handleCopy() {
    if (state.token === null || typeof window === 'undefined') return
    const url = `${window.location.origin}/join/${state.token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-6">
        <div>
          <span className="text-caption font-medium text-ink-muted">{groupName}</span>
          <h1 className="text-title font-semibold text-ink">Mời thành viên</h1>
        </div>
        <Link
          href={`/groups/${groupId}`}
          className="-mr-3 flex min-h-11 items-center rounded-control px-3 text-body font-semibold text-ink-muted hover:bg-surface-sunken"
        >
          Xong
        </Link>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-4 pt-3">
        {state.error !== null && <Banner tone="danger">{state.error}</Banner>}

        {copied && (
          <div className="flex items-start gap-2 rounded-control bg-yes-soft p-3">
            <span aria-hidden className="w-hairline self-stretch rounded-full bg-yes" />
            <span className="text-pretty text-body font-medium text-ink">
              Đã sao chép link mời vào bộ nhớ tạm.
            </span>
          </div>
        )}

        {inviteUrl !== null && state.expiresAt !== null ? (
          <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-raised p-4 shadow-card">
            <div className="flex flex-col gap-1">
              <span className="text-subtitle font-semibold text-ink">Link mời tham gia</span>
              <p className="text-caption text-ink-muted">
                Mỗi link dùng được một lần, cho một người. Hết hạn{' '}
                <span className="tabular-nums font-medium text-ink">
                  {new Date(state.expiresAt).toLocaleDateString('vi-VN')}
                </span>
                .
              </p>
            </div>
            <div className="rounded-control bg-surface-sunken p-3">
              <p className="break-all font-mono text-body font-normal text-ink">{inviteUrl}</p>
            </div>
            <Button type="button" variant="secondary" size="md" onClick={handleCopy}>
              {copied ? 'Đã sao chép' : 'Sao chép link'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-card border border-border bg-surface-raised p-6 shadow-card">
            <span className="text-subtitle font-semibold text-ink">Tạo link mời riêng tư</span>
            <p className="text-body text-ink-muted">
              Gửi link mời qua tin nhắn để người thân tham gia nhóm {groupName}. Mỗi link có hiệu
              lực trong 7 ngày và tự động vô hiệu sau khi được sử dụng.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8 pt-4">
        <form action={formAction}>
          <Button type="submit" variant="primary" pending={pending}>
            {state.token === null ? 'Tạo link mời' : 'Tạo link cho người tiếp theo'}
          </Button>
        </form>
        <Link
          href={`/groups/${groupId}`}
          className="flex min-h-11 items-center justify-center self-center rounded-control px-4 text-body font-semibold text-ink-muted hover:bg-surface-sunken"
        >
          Quay lại nhóm
        </Link>
      </div>
    </main>
  )
}
