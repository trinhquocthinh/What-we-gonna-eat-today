import type { ReactElement, ReactNode } from 'react'

export type EmptyStateCardProps = {
  title: string
  description: string
  children?: ReactNode
}

/**
 * Design Handoff: một câu nêu tình trạng + một câu nêu việc cần làm. Không
 * minh hoạ, không icon.
 */
export function EmptyStateCard({
  title,
  description,
  children,
}: EmptyStateCardProps): ReactElement {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-raised p-6">
      <h2 className="text-pretty text-title font-semibold text-ink">{title}</h2>
      <p className="text-pretty text-body-lg font-normal text-ink-muted">{description}</p>
      {children}
    </div>
  )
}
