'use client'

import type { ReactElement } from 'react'
import { useState } from 'react'

import { SYSTEM_TAGS, type SystemTag } from '../../domain/system-tag'
import { Button } from '@/shared/ui/button'
import { Sheet } from '@/shared/ui/sheet'

import { SYSTEM_TAG_LABELS } from './system-tag-label'

export type EditDishSheetProps = {
  dishId: string
  dishName: string
  initialTags: readonly SystemTag[]
  formAction: (formData: FormData) => void
  pending: boolean
  onClose: () => void
}

/**
 * Sửa nhãn cho một món đã có. ĐA CHỌN 0..5 — khác hẳn sheet thêm món (chọn một,
 * bắt buộc). Không phải bất nhất: xem DEC-025. Sheet thêm là lối nhập nhanh,
 * đây mới là chỗ sửa chi tiết, và Master Plan giao "sửa tag" đúng cho E2-T6.
 *
 * Checkbox chứ không radio: nhiều lựa chọn cùng lúc. Cùng `name="systemTag"`
 * nên `formData.getAll('systemTag')` trả về đúng mảng đã tick.
 */
export function EditDishSheet({
  dishId,
  dishName,
  initialTags,
  formAction,
  pending,
  onClose,
}: EditDishSheetProps): ReactElement {
  const [tags, setTags] = useState<readonly SystemTag[]>(initialTags)

  function toggle(tag: SystemTag): void {
    setTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    )
  }

  return (
    <Sheet title="Sửa nhãn món" onClose={onClose}>
      <h2 className="text-title font-semibold text-ink">{dishName}</h2>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="groupDishId" value={dishId} />

        <fieldset className="flex flex-col gap-2 border-0 p-0">
          <legend className="text-caption font-medium text-ink-muted">
            Nhãn — chọn bao nhiêu cũng được
          </legend>

          <div className="flex flex-wrap gap-2">
            {SYSTEM_TAGS.map((tag) => {
              const selected = tags.includes(tag)
              return (
                <label
                  key={tag}
                  className={`flex min-h-11 cursor-pointer items-center rounded-chip px-4 text-body font-medium ${
                    selected
                      ? 'bg-accent text-on-accent'
                      : 'border border-border bg-surface-raised text-ink'
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
        </fieldset>

        <Button type="submit" pending={pending}>
          {pending ? 'Đang lưu…' : 'Lưu nhãn'}
        </Button>
      </form>
    </Sheet>
  )
}
