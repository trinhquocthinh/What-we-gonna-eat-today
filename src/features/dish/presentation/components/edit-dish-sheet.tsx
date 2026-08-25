'use client'

import type { ReactElement } from 'react'
import { useState } from 'react'

import type { SystemTag } from '../../domain/system-tag'
import { Button } from '@/shared/ui/button'
import { Sheet } from '@/shared/ui/sheet'

import { SystemTagField } from './system-tag-field'

export type EditDishSheetProps = {
  dishId: string
  dishName: string
  initialTags: readonly SystemTag[]
  formAction: (formData: FormData) => void
  pending: boolean
  onClose: () => void
}

/**
 * Sửa nhãn cho một món đã có (E2-T6). ĐA CHỌN 0..5.
 *
 * Hàng chip dùng chung `SystemTagField` với sheet Thêm món — trước đây hai nơi
 * có hai bản markup gần y hệt, chỉ khác radio/checkbox. Từ khi sheet Thêm cũng
 * đa chọn thì không còn lý do gì để chúng tách nhau.
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

  return (
    <Sheet title="Sửa nhãn món" onClose={onClose}>
      <h2 className="text-title font-semibold text-ink">{dishName}</h2>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="groupDishId" value={dishId} />

        <SystemTagField value={tags} onChange={setTags} />

        <Button type="submit" pending={pending}>
          {pending ? 'Đang lưu…' : 'Lưu nhãn'}
        </Button>
      </form>
    </Sheet>
  )
}
