import type { ReactElement, ReactNode } from 'react'

type BannerTone = 'danger' | 'warning'

export type BannerProps = {
  tone: BannerTone
  children: ReactNode
}

/**
 * Design Handoff §Component library — một dải: thanh dọc 3px màu ngữ nghĩa,
 * nền `*-soft`, chữ `--ink`. Không dialog: lỗi nằm cạnh thứ gây ra lỗi.
 */
const TONE_CLASSES: Record<BannerTone, { background: string; bar: string }> = {
  danger: { background: 'bg-danger-soft', bar: 'bg-danger' },
  warning: { background: 'bg-warning-soft', bar: 'bg-warning' },
}

export function Banner({ tone, children }: BannerProps): ReactElement {
  const classes = TONE_CLASSES[tone]

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-control p-3 ${classes.background}`}
    >
      <span aria-hidden className={`w-hairline self-stretch rounded-full ${classes.bar}`} />
      <span className="text-pretty text-body font-medium text-ink">{children}</span>
    </div>
  )
}
