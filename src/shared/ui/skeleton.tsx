import type { ReactElement } from 'react'

/** Design Criteria: trạng thái tải dùng khung xương, KHÔNG dùng vòng quay. */
export function Skeleton({ className = '' }: { className?: string }): ReactElement {
  return (
    <span
      aria-hidden
      className={`block animate-skeleton rounded-control bg-surface-sunken ${className}`}
    />
  )
}
