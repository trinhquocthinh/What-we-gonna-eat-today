import Link from 'next/link'
import type { ReactElement } from 'react'

import { EmptyStateCard } from '@/shared/ui/empty-state-card'

import { GroupCard } from './group-card'

type GroupListItemView = {
  id: string
  name: string
  status: string
  meta: string
}

export type GroupListScreenProps = {
  dateCaption: string
  groups: GroupListItemView[]
}

export function GroupListScreen({ dateCaption, groups }: GroupListScreenProps): ReactElement {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex flex-col gap-1 px-4 pb-3 pt-6">
        <span className="text-caption font-medium text-ink-muted">{dateCaption}</span>
        <h1 className="text-title font-semibold text-ink">Nhóm của bạn</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto px-4 pb-2 pt-3">
        {groups.length === 0 ? (
          <EmptyStateCard
            title="Bạn chưa có nhóm nào."
            description="Tạo một nhóm cho nhà mình, rồi mời từng người bằng link."
          />
        ) : (
          groups.map((group) => <GroupCard key={group.id} {...group} />)
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-4 pb-8 pt-4">
        <Link
          href="/groups/new"
          className="flex min-h-14 w-full items-center justify-center rounded-control bg-accent px-6 text-subtitle font-semibold text-on-accent shadow-button transition-transform duration-100 hover:bg-accent-hover active:scale-[0.98] active:bg-accent-active"
        >
          Tạo nhóm
        </Link>
        {/* E2-T2: "Tôi có link mời" bật lên khi SPEC-004 có màn hình. */}
      </div>
    </main>
  )
}
