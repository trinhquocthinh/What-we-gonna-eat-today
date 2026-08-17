import type { ButtonHTMLAttributes, ReactElement } from 'react'

type ButtonVariant = 'primary' | 'secondary'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  /** Đang xử lý: giảm tương phản, khoá tương tác, KHÔNG đổi kích thước. */
  pending?: boolean
}

/**
 * Design Handoff §Component library.
 *
 * `quiet` và `danger` chưa có ở đây: chưa màn hình nào ở S1 dùng tới, và một
 * variant không ai gọi là mã chết mà knip phải canh. Thêm khi có chỗ dùng thật.
 */
const BASE_CLASSES =
  'w-full min-h-14 rounded-control px-6 text-subtitle font-semibold transition-transform duration-100 active:scale-[0.98] disabled:active:scale-100'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent shadow-button hover:bg-accent-hover active:bg-accent-active',
  secondary:
    'border border-border bg-surface-raised text-ink hover:border-border-strong hover:bg-surface active:bg-surface-sunken',
}

// Design Criteria: "Nút không được đổi kích thước khi chuyển sang trạng thái
// đang xử lý." Chỉ màu đổi.
const PENDING_CLASSES = 'bg-surface-sunken text-ink-muted'

export function Button({
  variant = 'primary',
  pending = false,
  className = '',
  children,
  ...rest
}: ButtonProps): ReactElement {
  return (
    <button
      {...rest}
      disabled={pending || rest.disabled === true}
      aria-busy={pending}
      className={`${BASE_CLASSES} ${pending ? PENDING_CLASSES : VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
