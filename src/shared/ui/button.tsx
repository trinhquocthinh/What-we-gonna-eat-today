import type { ButtonHTMLAttributes, ReactElement } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'quietAccent' | 'yes' | 'no'
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
  quietAccent:
    'bg-transparent text-accent hover:bg-surface hover:text-accent-hover active:bg-border',
  yes: 'bg-yes text-on-accent shadow-button hover:bg-yes-hover active:bg-yes',
  no: 'border border-border-strong bg-surface-raised text-no hover:border-no hover:text-ink active:bg-no-soft',
}

// Design Criteria §8 / E6-T6:
// PENDING_CLASSES và MUTED_CLASSES dùng `text-ink-muted` (5.17:1 trên surface-sunken,
// đạt chuẩn WCAG AA >= 4.5:1). `muted` là nút VẪN BẤM ĐƯỢC để báo lỗi validation (không
// được miễn trừ như disabled), nên không được dùng `--ink-faint` (2.67:1).
const PENDING_CLASSES = 'bg-surface-sunken text-ink-muted'
const MUTED_CLASSES = 'bg-surface-sunken text-ink-muted'

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
