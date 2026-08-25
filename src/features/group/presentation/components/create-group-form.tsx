'use client'

import Link from 'next/link'
import type { ReactElement } from 'react'
import { useActionState, useState } from 'react'

import { Button } from '@/shared/ui/button'
import { TextField } from '@/shared/ui/text-field'

import { TimeZoneField } from './time-zone-field'

export type CreateGroupFormState = {
  readonly nameError: string | null
}

const CREATE_GROUP_INITIAL_STATE: CreateGroupFormState = { nameError: null }

export type CreateGroupFormProps = {
  action: (state: CreateGroupFormState, formData: FormData) => Promise<CreateGroupFormState>
  /** Múi giờ ban đầu của form (mặc định từ server fallback). */
  initialTimeZone: string
}

export function CreateGroupForm({ action, initialTimeZone }: CreateGroupFormProps): ReactElement {
  const [state, formAction, pending] = useActionState(action, CREATE_GROUP_INITIAL_STATE)
  const [name, setName] = useState('')
  const [timeZone, setTimeZone] = useState(initialTimeZone)

  return (
    <form action={formAction} className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-6">
        <h1 className="text-title font-semibold text-ink">Tạo nhóm</h1>
        <Link
          href="/groups"
          className="-mr-3 flex min-h-11 items-center rounded-control px-3 text-body font-semibold text-ink-muted hover:bg-surface-sunken"
        >
          Huỷ
        </Link>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-4 pt-3">
        <TextField
          label="Tên nhóm"
          name="name"
          value={name}
          placeholder="Ví dụ: Nhà Bảy Hiền"
          error={state.nameError}
          onChange={setName}
        />
        <TimeZoneField value={timeZone} onChange={setTimeZone} />
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8 pt-4">
        {/* `muted` chứ không `disabled`: prototype cho bấm khi tên trống để
            hiện lỗi. Nút disabled không nói được vì sao nó disabled. */}
        <Button type="submit" pending={pending} muted={name.trim() === ''}>
          {pending ? 'Đang tạo…' : 'Tạo nhóm'}
        </Button>
        <span className="self-center text-caption font-medium text-ink-muted">
          Bạn sẽ là người quản lý nhóm này
        </span>
      </div>
    </form>
  )
}
