import type { ButtonHTMLAttributes, ReactElement } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'quietAccent'
type ButtonSize = 'lg' | 'md' | 'sm'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Đang xử lý: giảm tương phản, khoá tương tác, KHÔNG đổi kích thước. */
  pending?: boolean
  /** Chưa đủ điều kiện: giảm tương phản nhưng VẪN bấm được, để bấm ra lỗi.
   *  Khác hẳn `pending` và khác hẳn `disabled`. */
  muted?: boolean
}

const BASE_CLASSES =
  'rounded-control font-semibold transition-transform duration-100 active:scale-[0.98] disabled:active:scale-100'

const SIZE_CLASSES: Record<ButtonSize, string> = {
  lg: 'w-full min-h-14 px-6 text-subtitle',
  md: 'min-h-12 px-6 py-3 text-body',
  sm: 'min-h-11 px-4 py-3 text-body',
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent shadow-button hover:bg-accent-hover active:bg-accent-active',
  secondary:
    'border border-border bg-surface-raised text-ink hover:border-border-strong hover:bg-surface active:bg-surface-sunken',
  quiet: 'bg-transparent text-ink-muted hover:bg-surface-sunken active:bg-border',
  quietAccent: 'bg-transparent text-accent hover:bg-surface-sunken active:bg-border',
}

// Design Criteria: "Nút không được đổi kích thước khi chuyển sang trạng thái
// đang xử lý." Chỉ màu đổi.
const PENDING_CLASSES = 'bg-surface-sunken text-ink-muted'
const MUTED_CLASSES = 'bg-surface-sunken text-ink-faint'

function toneClasses(variant: ButtonVariant, pending: boolean, muted: boolean): string {
  if (pending) return PENDING_CLASSES
  if (muted) return MUTED_CLASSES
  return VARIANT_CLASSES[variant]
}

export function Button({
  variant = 'primary',
  size = 'lg',
  pending = false,
  muted = false,
  className = '',
  children,
  ...rest
}: ButtonProps): ReactElement {
  return (
    <button
      {...rest}
      disabled={pending || rest.disabled === true}
      aria-busy={pending}
      className={`${BASE_CLASSES} ${SIZE_CLASSES[size]} ${toneClasses(variant, pending, muted)} ${className}`}
    >
      {children}
    </button>
  )
}
