'use client'

import type { ReactElement } from 'react'

import { SYSTEM_TAGS, type SystemTag } from '../../domain/system-tag'
import { SYSTEM_TAG_LABELS } from './system-tag-label'
import { InlineError } from '@/shared/ui/inline-error'

export type SystemTagFieldProps = {
  value: readonly SystemTag[]
  error?: string | null
  onChange: (tags: readonly SystemTag[]) => void
  /** Chữ trên `<legend>`. Hai sheet nói hai câu khác nhau nhưng dùng chung
   *  hàng chip này. */
  legend?: string
}

/**
 * Hàng chip chọn nhãn — DÙNG CHUNG cho sheet Thêm món (S-06) và sheet Sửa nhãn.
 *
 * ĐA CHỌN 0..5, đúng mô hình `group_dish_tags` và SPEC-006. Bản cũ ép chọn MỘT
 * (radio, DEC-031), khiến món ghép như "Bún chả" không thể mang cả `STAPLE` lẫn
 * `MAIN` ngay lúc tạo — phải thêm xong rồi mở sheet sửa mới gán được tag thứ
 * hai. Mà Independent Tag Counting (BR-012, SDD §8) lại dựa hẳn vào việc một
 * món mang nhiều tag, nên ép một tag là bóp mô hình ở đúng chỗ nó cần rộng.
 *
 * `checkbox` chứ không `radio`, cùng `name="systemTag"` → `formData.getAll('systemTag')`
 * trả về đúng mảng đã tick.
 *
 * `sr-only` chứ không `hidden`: input vẫn nhận được focus bàn phím và vẫn nằm
 * trong FormData. `hidden` thì mất cả hai.
 *
 * Chiều cao 44px lấy từ mockup — cũng vừa đúng ngưỡng vùng chạm tối thiểu.
 */
export function SystemTagField({
  value,
  error = null,
  onChange,
  legend = 'Nhãn — chọn bao nhiêu cũng được',
}: SystemTagFieldProps): ReactElement {
  function toggle(tag: SystemTag): void {
    onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag])
  }

  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="text-caption font-medium text-ink-muted">{legend}</legend>

      <div className="flex flex-wrap gap-2">
        {SYSTEM_TAGS.map((tag) => {
          const selected = value.includes(tag)
          return (
            <label
              key={tag}
              className={`flex min-h-11 cursor-pointer items-center rounded-chip px-4 text-body font-medium transition-colors ${
                selected
                  ? 'bg-accent text-on-accent'
                  : 'border border-border bg-surface-raised text-ink hover:border-border-strong'
              }`}
            >
              <input
                type="checkbox"
                name="systemTag"
                value={tag}
                checked={selected}
                onChange={() => toggle(tag)}
                className="sr-only"
              />
              {SYSTEM_TAG_LABELS[tag]}
            </label>
          )
        })}
      </div>

      <InlineError message={error} />
    </fieldset>
  )
}
