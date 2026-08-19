'use client'

import type { ReactElement } from 'react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'
import { Sheet, useSheetClose } from '@/shared/ui/sheet'
import { TextField } from '@/shared/ui/text-field'

import type { SystemTag } from '../../domain/system-tag'
import { SystemTagField } from './system-tag-field'

export type AddDishSheetProps = {
  formAction: (formData: FormData) => void
  nameError: string | null
  systemTagError: string | null
  pending: boolean
  onClose: () => void
}

function AddDishSheetForm({
  formAction,
  nameError,
  systemTagError,
  pending,
}: Omit<AddDishSheetProps, 'onClose'>): ReactElement {
  const [name, setName] = useState('')
  const [tag, setTag] = useState<SystemTag | null>(null)
  const close = useSheetClose()

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">Thêm món</h2>
        <Button type="button" variant="quiet" size="sm" className="-mr-3 -mt-3" onClick={close}>
          Đóng
        </Button>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <TextField
          label="Tên món"
          name="name"
          value={name}
          placeholder="Ví dụ: Cá basa kho tiêu"
          error={nameError}
          onChange={setName}
        />

        <SystemTagField value={tag} error={systemTagError} onChange={setTag} />

        {/* `muted` chứ không `disabled`: thiết kế cho bấm khi tên trống hoặc chưa chọn tag để HIỆN
            lỗi. Nút disabled không nói được vì sao nó disabled. */}
        <Button type="submit" pending={pending} muted={name.trim() === '' || tag === null}>
          {pending ? 'Đang thêm…' : 'Thêm vào danh mục'}
        </Button>
      </form>
    </>
  )
}

/**
 * S-06: ô tên và hàng chip chọn nhãn.
 *
 * CỐ Ý chưa có: khối "Nhà bạn đã có món gần giống" (E2-T7).
 *
 * `name` và `tag` là state CỤC BỘ của sheet: sheet bị unmount khi đóng, nên thêm thành
 * công là ô tên tự sạch cho lần mở sau — không phải viết lệnh reset nào. Trong
 * lúc sheet còn mở (trường hợp lỗi), input controlled giữ nguyên chữ đã gõ qua
 * vòng action, đúng như S2 §2.5 đã ghi.
 */
export function AddDishSheet({
  formAction,
  nameError,
  systemTagError,
  pending,
  onClose,
}: AddDishSheetProps): ReactElement {
  return (
    <Sheet title="Thêm món" onClose={onClose}>
      <AddDishSheetForm
        formAction={formAction}
        nameError={nameError}
        systemTagError={systemTagError}
        pending={pending}
      />
    </Sheet>
  )
}
