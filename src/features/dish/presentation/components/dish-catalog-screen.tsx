'use client'

import type { ReactElement } from 'react'
import { useActionState, useMemo, useState } from 'react'

import { Button } from '@/shared/ui/button'
import { EmptyStateCard } from '@/shared/ui/empty-state-card'

import { groupDishesByTag } from '../../domain/dish-group'
import { normalizeDishName } from '../../domain/normalize-name'
import type { SystemTag } from '../../domain/system-tag'
import { AddDishSheet } from './add-dish-sheet'
import { DishRow } from './dish-row'
import { DishSearchField } from './dish-search-field'
import { EditDishSheet } from './edit-dish-sheet'
import { SYSTEM_TAG_LABELS } from './system-tag-label'

const DISH_EXAMPLES = ['Cá basa kho tiêu', 'Canh chua cá lóc', 'Gà chiên nước mắm']

/** Không optional property nào — `exactOptionalPropertyTypes` không có chỗ nổ.
 *  Cùng hình dạng `CreateGroupFormState` của S2. */
export type AddDishFormState = {
  readonly nameError: string | null
  readonly systemTagError: string | null
  readonly addedDishName: string | null
  readonly reusedDishName: string | null
  readonly candidates: readonly { readonly id: string; readonly name: string }[]
}

const ADD_DISH_INITIAL_STATE: AddDishFormState = {
  nameError: null,
  systemTagError: null,
  addedDishName: null,
  reusedDishName: null,
  candidates: [],
}

export type EditDishFormState = {
  readonly error: string | null
  readonly savedAt: number | null
}

const EDIT_DISH_INITIAL_STATE: EditDishFormState = {
  error: null,
  savedAt: null,
}

async function defaultEditAction(): Promise<EditDishFormState> {
  return EDIT_DISH_INITIAL_STATE
}

export type DishCatalogScreenProps = {
  groupName: string
  /** Chuyển tiếp cho `AddDishSheet` — ô gợi ý catalog chung tra theo nhóm để
   *  loại những món nhóm đang có (SPEC-023). */
  groupId: string
  dishes: { id: string; name: string; systemTags: readonly SystemTag[] }[]
  inactiveDishes?: readonly { id: string; name: string; systemTags?: readonly SystemTag[] }[]
  canEdit?: boolean
  action: (state: AddDishFormState, formData: FormData) => Promise<AddDishFormState>
  editAction?: (state: EditDishFormState, formData: FormData) => Promise<EditDishFormState>
  removeAction?: (groupDishId: string) => Promise<{ error: string | null }>
  reAddAction?: (groupDishId: string) => Promise<{ error: string | null }>
}

/**
 * S-05. Là client component vì bốn thứ dưới đây là MỘT khối tương tác: nhãn
 * CTA, số đếm, toast, và sheet. Tách chúng ra thì state phải nâng lên một
 * wrapper — đúng thứ này đang là.
 */
export function DishCatalogScreen({
  groupName,
  groupId,
  dishes,
  inactiveDishes = [],
  canEdit = true,
  action,
  editAction = defaultEditAction,
  removeAction,
  reAddAction,
}: DishCatalogScreenProps): ReactElement {
  const [state, formAction, pending] = useActionState(action, ADD_DISH_INITIAL_STATE)
  const [prevActionState, setPrevActionState] = useState(state)
  const [editState, editFormAction, editPending] = useActionState(
    editAction,
    EDIT_DISH_INITIAL_STATE,
  )
  const [prevEditState, setPrevEditState] = useState(editState)
  const [isSheetOpen, setSheetOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [editingDish, setEditingDish] = useState<{
    id: string
    name: string
    systemTags: readonly SystemTag[]
  } | null>(null)
  const [inGroupReusedName, setInGroupReusedName] = useState<string | null>(null)
  const [actionToast, setActionToast] = useState<string | null>(null)
  const [busyDishId, setBusyDishId] = useState<string | null>(null)

  // Thêm / dùng lại từ server thành công thì sheet đóng và xoá query. Chỉ đóng khi
  // có tên trả về — thất bại phải giữ sheet mở để lỗi hiện đúng chỗ.
  if (state !== prevActionState) {
    setPrevActionState(state)
    if (state.addedDishName !== null || state.reusedDishName !== null) {
      setSheetOpen(false)
      setQuery('')
      setInGroupReusedName(null)
      setActionToast(null)
    }
  }

  // Sửa nhãn thành công thì đóng sheet sửa.
  if (editState !== prevEditState) {
    setPrevEditState(editState)
    if (editState.savedAt !== null && editState.error === null) {
      setEditingDish(null)
    }
  }

  const handleRemove = async (dishId: string, dishName: string) => {
    if (!removeAction || busyDishId !== null) return
    setBusyDishId(dishId)
    const result = await removeAction(dishId)
    setBusyDishId(null)
    if (result.error === null) {
      setActionToast(`Đã gỡ ${dishName} khỏi nhóm.`)
    }
  }

  const handleReAdd = async (dishId: string, dishName: string) => {
    if (!reAddAction || busyDishId !== null) return
    setBusyDishId(dishId)
    const result = await reAddAction(dishId)
    setBusyDishId(null)
    if (result.error === null) {
      setActionToast(`Đã thêm lại ${dishName} vào nhóm.`)
    }
  }

  const hasDishes = dishes.length > 0

  const visibleDishes = useMemo(() => {
    const needle = normalizeDishName(query)
    return needle === '' ? dishes : dishes.filter((d) => normalizeDishName(d.name).includes(needle))
  }, [dishes, query])

  const visibleInactiveDishes = useMemo(() => {
    if (!canEdit || inactiveDishes.length === 0) return []
    const needle = normalizeDishName(query)
    return needle === ''
      ? inactiveDishes
      : inactiveDishes.filter((d) => normalizeDishName(d.name).includes(needle))
  }, [canEdit, inactiveDishes, query])

  const hasAnyDishes = hasDishes || visibleInactiveDishes.length > 0
  const noMatch =
    (hasDishes || inactiveDishes.length > 0) &&
    query.trim() !== '' &&
    visibleDishes.length === 0 &&
    visibleInactiveDishes.length === 0
  const groups = useMemo(() => groupDishesByTag(visibleDishes), [visibleDishes])

  // Toast SUY RA từ state và tương tác: mở sheet là toast ẩn.
  const toast =
    isSheetOpen || editingDish !== null
      ? null
      : actionToast !== null
        ? actionToast
        : inGroupReusedName !== null
          ? `Dùng lại ${inGroupReusedName} — đã có trong danh mục.`
          : state.addedDishName !== null
            ? `Đã thêm ${state.addedDishName} vào danh mục.`
            : state.reusedDishName !== null
              ? `Dùng lại ${state.reusedDishName} — đã có trong danh mục.`
              : null

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
        {hasDishes || inactiveDishes.length > 0 ? (
          <DishSearchField value={query} onChange={setQuery} />
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 pb-2 pt-1">
        {!hasAnyDishes && !hasDishes && inactiveDishes.length === 0 ? (
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
        ) : noMatch ? (
          <div className="flex flex-col gap-2 rounded-control border border-border bg-surface-raised p-4">
            <span className="text-subtitle font-semibold text-ink">
              {`Không có món nào khớp “${query}”.`}
            </span>
            <span className="text-body font-normal text-ink-muted">
              Thêm nó vào danh mục bằng nút bên dưới.
            </span>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <section key={group.tag ?? 'untagged'} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-caption font-medium text-ink-muted">
                    {group.tag === null ? 'Chưa phân nhãn' : SYSTEM_TAG_LABELS[group.tag]}
                  </span>
                  <span className="text-caption font-medium tabular-nums text-ink-muted">
                    {group.dishes.length}
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {group.dishes.map((dish) => (
                    <DishRow
                      key={`${group.tag ?? 'untagged'}-${dish.id}`}
                      name={dish.name}
                      meta=""
                      onClick={
                        canEdit
                          ? () => {
                              setInGroupReusedName(null)
                              setActionToast(null)
                              setEditingDish(dish)
                            }
                          : undefined
                      }
                      action={
                        canEdit && removeAction ? (
                          <Button
                            type="button"
                            variant="quiet"
                            size="sm"
                            pending={busyDishId === dish.id}
                            disabled={busyDishId !== null}
                            onClick={() => handleRemove(dish.id, dish.name)}
                          >
                            Gỡ
                          </Button>
                        ) : undefined
                      }
                    />
                  ))}
                </ul>
              </section>
            ))}

            {canEdit && visibleInactiveDishes.length > 0 ? (
              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-caption font-medium text-ink-muted">Đã gỡ khỏi nhóm</span>
                  <span className="text-caption font-medium tabular-nums text-ink-muted">
                    {visibleInactiveDishes.length}
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {visibleInactiveDishes.map((dish) => (
                    <DishRow
                      key={`inactive-${dish.id}`}
                      name={dish.name}
                      action={
                        canEdit && reAddAction ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            pending={busyDishId === dish.id}
                            disabled={busyDishId !== null}
                            onClick={() => handleReAdd(dish.id, dish.name)}
                          >
                            Thêm lại
                          </Button>
                        ) : undefined
                      }
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-surface px-4 pb-8 pt-4">
        {toast === null ? null : (
          <div role="status" className="flex items-start gap-2 rounded-control bg-yes-soft p-3">
            <span aria-hidden className="w-hairline self-stretch rounded-full bg-yes" />
            <span className="text-pretty text-body font-medium text-ink">{toast}</span>
          </div>
        )}

        <Button
          type="button"
          onClick={() => {
            setInGroupReusedName(null)
            setActionToast(null)
            setSheetOpen(true)
          }}
        >
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
          groupId={groupId}
          formAction={formAction}
          nameError={state.nameError}
          systemTagError={state.systemTagError}
          candidates={state.candidates}
          existingDishes={dishes}
          initialName={query}
          onUseInGroup={(name) => {
            setSheetOpen(false)
            setInGroupReusedName(name)
            setQuery('')
          }}
          pending={pending}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}

      {canEdit && editingDish !== null ? (
        <EditDishSheet
          dishId={editingDish.id}
          dishName={editingDish.name}
          initialTags={editingDish.systemTags}
          formAction={editFormAction}
          pending={editPending}
          onClose={() => setEditingDish(null)}
        />
      ) : null}
    </main>
  )
}
