'use client'

import type { ReactElement } from 'react'

import { SYSTEM_TAGS, type SystemTag } from '../../domain/system-tag'
import { SYSTEM_TAG_LABELS } from './system-tag-label'

export type SystemTagFieldProps = {
  value: SystemTag | null
  error: string | null
  onChange: (tag: SystemTag) => void
}

/**
 * S-06 — hàng chip "Nhãn — chọn một".
 *
 * CHỌN MỘT là quyết định của riêng màn này (mockup dòng 130/222/232), KHÔNG
 * phải giới hạn của mô hình: `group_dish_tags` và `setSystemTags` nhận 0..5
 * (BR-003, TC-022, TC-100). Màn sửa tag đa chọn là E2-T6. Đừng "sửa cho nhất
 * quán" bằng cách bóp mô hình xuống một tag.
 *
 * Chiều cao 44px lấy từ mockup — cũng vừa đúng ngưỡng vùng chạm tối thiểu.
 */
export function SystemTagField({ value, error, onChange }: SystemTagFieldProps): ReactElement {
  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="text-caption font-medium text-ink-muted">Nhãn — chọn một</legend>

      <div className="flex flex-wrap gap-2">
        {SYSTEM_TAGS.map((tag) => {
          const selected = value === tag
          return (
            <label
              key={tag}
              className={`flex min-h-11 cursor-pointer items-center rounded-chip px-4 text-body font-medium transition-colors ${
                selected
                  ? 'bg-accent text-on-accent'
                  : 'border border-border bg-surface-raised text-ink hover:border-border-strong'
              }`}
            >
              {/* `sr-only` chứ không `hidden`: input vẫn nhận được focus bàn
                  phím và vẫn nằm trong FormData. `hidden` thì mất cả hai. */}
              <input
                type="radio"
                name="systemTag"
                value={tag}
                checked={selected}
                onChange={() => onChange(tag)}
                className="sr-only"
              />
              {SYSTEM_TAG_LABELS[tag]}
            </label>
          )
        })}
      </div>

      {error === null ? null : (
        <span role="alert" className="text-caption font-medium text-danger">
          {error}
        </span>
      )}
    </fieldset>
  )
}
