'use client'

import type { ReactElement } from 'react'
import { useActionState, useState } from 'react'

import { Button } from '@/shared/ui/button'
import { EmptyStateCard } from '@/shared/ui/empty-state-card'

import { AddDishSheet } from './add-dish-sheet'
import { DishRow } from './dish-row'

const DISH_EXAMPLES = ['Cá basa kho tiêu', 'Canh chua cá lóc', 'Gà chiên nước mắm']

/** Không optional property nào — `exactOptionalPropertyTypes` không có chỗ nổ.
 *  Cùng hình dạng `CreateGroupFormState` của S2. */
export type AddDishFormState = {
  readonly nameError: string | null
  readonly addedDishName: string | null
}

const ADD_DISH_INITIAL_STATE: AddDishFormState = { nameError: null, addedDishName: null }

export type DishCatalogScreenProps = {
  groupName: string
  dishes: { id: string; name: string }[]
  action: (state: AddDishFormState, formData: FormData) => Promise<AddDishFormState>
}

/**
 * S-05. Là client component vì bốn thứ dưới đây là MỘT khối tương tác: nhãn
 * CTA, số đếm, toast, và sheet. Tách chúng ra thì state phải nâng lên một
 * wrapper — đúng thứ này đang là. Cùng hình dạng `CreateGroupForm` của S2:
 * một màn hình client nhận Server Action qua prop.
 *
 * CỐ Ý chưa có ở S3: ô tìm kiếm (E2-T6), nhóm theo nhãn (E2-T5/T6), thẻ "không
 * khớp" (E2-T6), nhóm "Đã gỡ khỏi nhóm" (F27/v1.1).
 */
export function DishCatalogScreen({
  groupName,
  dishes,
  action,
}: DishCatalogScreenProps): ReactElement {
  const [state, formAction, pending] = useActionState(action, ADD_DISH_INITIAL_STATE)
  const [prevActionState, setPrevActionState] = useState(state)
  const [isSheetOpen, setSheetOpen] = useState(false)

  // Thêm thành công thì sheet đóng. Chỉ đóng khi có tên trả về — thất bại phải
  // giữ sheet mở để lỗi hiện đúng chỗ.
  if (state !== prevActionState) {
    setPrevActionState(state)
    if (state.addedDishName !== null) {
      setSheetOpen(false)
    }
  }

  // Toast SUY RA từ state, không lưu riêng: mở sheet lại là toast biến mất,
  // đúng như prototype (`openSheet` đặt `toast: ""`). Không thêm useState nào.
  const toast = isSheetOpen ? null : state.addedDishName

  const hasDishes = dishes.length > 0

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex flex-col gap-3 px-4 pb-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-caption font-medium text-ink-muted">{groupName}</span>
            <h1 className="text-title font-semibold text-ink">Danh mục món</h1>
          </div>
          <span className="pt-[22px] text-caption font-semibold tabular-nums text-ink-muted">
            {hasDishes ? `${dishes.length} món` : ''}
          </span>
        </div>
        {/* E2-T6: ô tìm "Tìm món trong nhà" 48px vào đây. */}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 pb-2 pt-1">
        {hasDishes ? (
          <ul className="flex flex-col gap-2">
            {dishes.map((dish) => (
              <DishRow key={dish.id} name={dish.name} meta="" />
            ))}
          </ul>
        ) : (
          <EmptyStateCard
            title="Chưa có món nào."
            description="Thêm những món nhà bạn thật sự hay ăn. Cứ viết như cách cả nhà gọi tên."
          >
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              {DISH_EXAMPLES.map((example) => (
                <span key={example} className="text-body-lg font-normal text-ink-faint">
                  {example}
                </span>
              ))}
            </div>
          </EmptyStateCard>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-surface px-4 pb-8 pt-4">
        {toast === null ? null : (
          <div role="status" className="flex items-start gap-2 rounded-control bg-yes-soft p-3">
            <span aria-hidden className="w-hairline self-stretch rounded-full bg-yes" />
            <span className="text-pretty text-body font-medium text-ink">
              {`Đã thêm ${toast} vào danh mục.`}
            </span>
          </div>
        )}

        <Button type="button" onClick={() => setSheetOpen(true)}>
          {hasDishes ? 'Thêm món' : 'Thêm món đầu tiên'}
        </Button>

        {hasDishes ? (
          <span className="self-center text-caption font-medium text-ink-muted">
            Khoảng 15–20 món là đủ để bắt đầu
          </span>
        ) : null}
      </div>

      {isSheetOpen ? (
        <AddDishSheet
          formAction={formAction}
          nameError={state.nameError}
          pending={pending}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}
    </main>
  )
}
