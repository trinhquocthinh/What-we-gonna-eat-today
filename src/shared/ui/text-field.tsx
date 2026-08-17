import type { ReactElement } from 'react'
import { useId } from 'react'

export type TextFieldProps = {
  label: string
  name: string
  value: string
  placeholder: string
  /** `null` khi không có lỗi. Không dùng optional property —
   *  `exactOptionalPropertyTypes` cấm gán `undefined` vào nó. */
  error: string | null
  onChange: (value: string) => void
}

export function TextField({
  label,
  name,
  value,
  placeholder,
  error,
  onChange,
}: TextFieldProps): ReactElement {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-caption font-medium text-ink-muted">
        {label}
      </label>

      <input
        id={id}
        name={name}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error !== null}
        aria-describedby={error === null ? undefined : errorId}
        className={`min-h-12 w-full rounded-chip border bg-surface-raised px-4 py-3 text-body-lg text-ink placeholder:text-ink-faint ${
          error === null ? 'border-border' : 'border-danger'
        }`}
      />

      {/* Design Criteria: lỗi nằm ngay cạnh thứ gây ra lỗi, không dùng dialog. */}
      {error === null ? null : (
        <span id={errorId} className="text-caption font-medium text-danger">
          {error}
        </span>
      )}
    </div>
  )
}
