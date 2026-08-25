'use client'

import type { ReactElement } from 'react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'
import { Sheet, useSheetClose } from '@/shared/ui/sheet'
import { TextField } from '@/shared/ui/text-field'

import { CatalogSuggestions } from './catalog-suggestions'
import { findNearMatches } from '../../domain/near-match'
import type { SystemTag } from '../../domain/system-tag'
import type { DuplicateCandidate } from './duplicate-sheet'
import { DuplicateSheet } from './duplicate-sheet'
import { SystemTagField } from './system-tag-field'
import { SYSTEM_TAG_LABELS } from './system-tag-label'
import { useCatalogSuggestions } from './use-catalog-suggestions'

export type AddDishSheetProps = {
  groupId: string
  formAction: (formData: FormData) => void
  nameError: string | null
  systemTagError: string | null
  candidates?: readonly { readonly id: string; readonly name: string }[]
  existingDishes?: readonly {
    readonly id: string
    readonly name: string
    readonly systemTags: readonly SystemTag[]
  }[]
  initialName?: string
  onUseInGroup?: (name: string) => void
  pending: boolean
  onClose: () => void
}

function AddDishSheetForm({
  groupId,
  formAction,
  nameError,
  systemTagError,
  candidates = [],
  existingDishes = [],
  initialName = '',
  onUseInGroup,
  pending,
}: Omit<AddDishSheetProps, 'onClose'>): ReactElement {
  const [name, setName] = useState(initialName)
  const [tags, setTags] = useState<readonly SystemTag[]>([])
  const [forced, setForced] = useState(false)
  const close = useSheetClose()

  const inGroupNearMatches = !forced ? findNearMatches(existingDishes, name) : []
  const hasNearMatch = inGroupNearMatches.length > 0

  const activeCandidates: readonly DuplicateCandidate[] =
    !forced && candidates.length > 0
      ? candidates.map((c) => ({
          kind: 'global' as const,
          id: c.id,
          name: c.name,
          meta: '',
        }))
      : inGroupNearMatches.map((d) => ({
          kind: 'inGroup' as const,
          id: d.id,
          name: d.name,
          // ` + ` chứ không ` · `: nhãn `STAPLE` tự nó chứa dấu `·`.
          meta: d.systemTags.map((t) => SYSTEM_TAG_LABELS[t]).join(' + '),
        }))

  const hasDuplicatePanel = activeCandidates.length > 0

  // Gợi ý catalog chung nhường chỗ cho panel trùng lặp: panel kia là CẢNH BÁO
  // ("nhà bạn có thể đã có món này rồi"), phải đọc trước phần KHÁM PHÁ.
  //
  // Hai danh sách không bao giờ chứa cùng một món: câu tra đã loại những món
  // nhóm đang ACTIVE, mà `findNearMatches` chỉ chạy trên đúng tập ACTIVE đó.
  const catalogSuggestions = useCatalogSuggestions(groupId, name)
  const visibleSuggestions = !forced && !hasDuplicatePanel ? catalogSuggestions : []

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">Thêm món</h2>
        <Button type="button" variant="quiet" size="sm" className="-mr-3 -mt-3" onClick={close}>
          Đóng
        </Button>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="forceCreate" value={String(forced)} />
        <input type="hidden" name="hasNearMatch" value={String(hasNearMatch)} />

        <TextField
          label="Tên món"
          name="name"
          value={name}
          placeholder="Ví dụ: Cá basa kho tiêu"
          error={nameError}
          onChange={(val) => {
            setName(val)
            setForced(false)
          }}
        />

        {hasDuplicatePanel ? (
          <DuplicateSheet
            candidates={activeCandidates}
            onUseInGroup={(reusedName) => {
              if (onUseInGroup) {
                onUseInGroup(reusedName)
              }
              close()
            }}
            onForceCreate={() => setForced(true)}
          />
        ) : null}

        {visibleSuggestions.length > 0 ? (
          <CatalogSuggestions suggestions={visibleSuggestions} hasTags={tags.length > 0} />
        ) : null}

        <SystemTagField
          value={tags}
          error={systemTagError}
          onChange={setTags}
          legend="Nhãn — chọn bao nhiêu cũng được"
        />

        {/* `muted` chứ không `disabled`: thiết kế cho bấm khi tên trống hoặc chưa chọn tag để HIỆN
            lỗi. Nút disabled không nói được vì sao nó disabled. Hạ tông khi đang có ứng viên trùng. */}
        <Button
          type="submit"
          pending={pending}
          muted={name.trim() === '' || tags.length === 0 || hasDuplicatePanel}
        >
          {pending ? 'Đang thêm…' : 'Thêm vào danh mục'}
        </Button>
      </form>
    </>
  )
}

/**
 * S-06: ô tên, hàng chip chọn nhãn, và khối phát hiện trùng (E2-T7).
 *
 * `name` và `tag` là state CỤC BỘ của sheet: sheet bị unmount khi đóng, nên thêm thành
 * công là ô tên tự sạch cho lần mở sau — không phải viết lệnh reset nào. Trong
 * lúc sheet còn mở (trường hợp lỗi), input controlled giữ nguyên chữ đã gõ qua
 * vòng action, đúng như S2 §2.5 đã ghi.
 */
export function AddDishSheet({
  groupId,
  formAction,
  nameError,
  systemTagError,
  candidates = [],
  existingDishes = [],
  initialName = '',
  onUseInGroup = () => {},
  pending,
  onClose,
}: AddDishSheetProps): ReactElement {
  return (
    <Sheet title="Thêm món" onClose={onClose}>
      <AddDishSheetForm
        groupId={groupId}
        formAction={formAction}
        nameError={nameError}
        systemTagError={systemTagError}
        candidates={candidates}
        existingDishes={existingDishes}
        initialName={initialName}
        onUseInGroup={onUseInGroup}
        pending={pending}
      />
    </Sheet>
  )
}
