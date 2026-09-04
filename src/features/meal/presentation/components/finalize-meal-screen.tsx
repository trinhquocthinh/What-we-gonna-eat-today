'use client'

import Link from 'next/link'
import type { ReactElement } from 'react'
import { useActionState, useMemo, useState } from 'react'

import type { SessionRule } from '@/features/rule/domain/evaluate'
import type { SystemTag } from '@/shared/domain/system-tag'
import { EmptyStateCard } from '@/shared/ui/empty-state-card'
import { SYSTEM_TAG_LABELS } from '@/shared/ui/system-tag-label'

import { DishScoreRow } from './dish-score-row'
import { FinalizeBar } from './finalize-bar'

export type SummaryDish = {
  readonly dishId: string
  readonly name: string
  readonly systemTags: readonly SystemTag[]
  readonly proposedCount: number
  readonly rejectedCount: number
  readonly cannotEatCount: number
  readonly recentEaterCount: number
  /** `null` với món ở mục "Chưa ai chọn" — TC-061: chúng KHÔNG có điểm. */
  readonly score: number | null
}

export type FinalizeFormState = {
  readonly error: string | null
}

export type FinalizeMealScreenProps = {
  dateCaption: string
  /** "3 trong 4 người đã xong" — dựng ở `app/`, không tính lại ở đây. */
  progressCaption: string
  ranked: readonly SummaryDish[]
  untouched: readonly SummaryDish[]
  rules: readonly SessionRule[]
  targetDishCount?: number | null | undefined
  closeHref: string
  action: (state: FinalizeFormState, formData: FormData) => Promise<FinalizeFormState>
}

const INITIAL_STATE: FinalizeFormState = { error: null }

/**
 * Nối bằng ` + `, KHÔNG phải ` · `: nhãn của `STAPLE` tự nó đã chứa dấu `·`
 * ("Cơm · Bún · Phở"), nên nối bằng `·` thì món hai tag đọc thành một chuỗi
 * không phân tách được. Dấu `+` cũng nói đúng ý "mang CẢ HAI nhãn".
 */
function formatTags(tags: readonly SystemTag[]): string {
  if (tags.length === 0) return 'Chưa gán nhãn'
  return tags.map((t) => SYSTEM_TAG_LABELS[t]).join(' + ')
}

/**
 * S-10 — Màn hình tổng hợp và chốt bữa (E5-T7 + E5-T8 + E5-T9).
 *
 * Toàn bộ màn hình sống ở `features/meal/presentation/` vì đây là màn chốt bữa
 * (SPEC-015 + SPEC-016), và ba việc chia sẻ chung state danh sách món đang chọn.
 */
export function FinalizeMealScreen({
  dateCaption,
  progressCaption,
  ranked,
  untouched,
  rules,
  targetDishCount = null,
  closeHref,
  action,
}: FinalizeMealScreenProps): ReactElement {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE)

  const allDishes = useMemo(() => [...ranked, ...untouched], [ranked, untouched])
  const selectedDishes = useMemo(
    () => allDishes.filter((d) => selectedIds.has(d.dishId)),
    [allDishes, selectedIds],
  )

  const handleToggle = (dishId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(dishId)) {
        next.delete(dishId)
      } else {
        next.add(dishId)
      }
      return next
    })
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-6">
        <div className="flex flex-col gap-1">
          <span className="text-caption font-medium text-ink-muted">{dateCaption}</span>
          <h1 className="text-title font-semibold text-ink">Tổng hợp &amp; Chốt bữa</h1>
          <span className="text-caption font-medium text-ink-muted">{progressCaption}</span>
        </div>
        <Link
          href={closeHref}
          className="flex min-h-11 items-center justify-center rounded-control px-3 text-body font-semibold text-ink-muted hover:bg-surface-sunken"
        >
          Đóng
        </Link>
      </header>

      <form action={formAction} className="flex flex-1 flex-col">
        {Array.from(selectedIds).map((id) => (
          <input key={id} type="hidden" name="dishId" value={id} />
        ))}

        {/* jscpd:ignore-start */}
        <div className="flex flex-1 flex-col gap-6 px-4 pt-3 pb-6">
          {ranked.length === 0 && untouched.length === 0 ? (
            <EmptyStateCard
              title="Chưa ai vuốt món nào."
              description="Đợi cả nhà chọn xong rồi quay lại, hoặc tự chọn món ngay bây giờ."
            />
          ) : null}

          {ranked.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-subtitle font-semibold text-ink">Cả nhà nghiêng về</h2>
              <div className="flex flex-col gap-3">
                {ranked.map((dish) => (
                  <DishScoreRow
                    key={dish.dishId}
                    dish={dish}
                    selected={selectedIds.has(dish.dishId)}
                    onToggle={handleToggle}
                    tagLabel={formatTags(dish.systemTags)}
                  />
                ))}
              </div>
            </section>
          )}

          {untouched.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-subtitle font-semibold text-ink">Chưa ai chọn</h2>
              <div className="flex flex-col gap-3">
                {untouched.map((dish) => (
                  <DishScoreRow
                    key={dish.dishId}
                    dish={dish}
                    selected={selectedIds.has(dish.dishId)}
                    onToggle={handleToggle}
                    tagLabel={formatTags(dish.systemTags)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
        {/* jscpd:ignore-end */}

        <FinalizeBar
          selectedDishes={selectedDishes}
          rules={rules}
          targetDishCount={targetDishCount}
          pending={pending}
          error={state.error}
        />
      </form>
    </main>
  )
}
