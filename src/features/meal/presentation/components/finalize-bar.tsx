'use client'

import type { ReactElement } from 'react'
import { useState } from 'react'

import { evaluateRules, type RequiredRule } from '@/features/rule/domain/evaluate'
import {
  ruleSentence,
  ruleShortfallPhrase,
} from '@/features/rule/presentation/components/rule-sentence'
import type { SystemTag } from '@/shared/domain/system-tag'
import { Button } from '@/shared/ui/button'
import { InlineError } from '@/shared/ui/inline-error'

export type FinalizeBarProps = {
  selectedDishes: readonly { dishId: string; name: string; systemTags: readonly SystemTag[] }[]
  rules: readonly RequiredRule[]
  targetDishCount?: number | null | undefined
  pending: boolean
  error: string | null
}

/**
 * S-10 dải đáy. E5-T8 (khay) + E5-T9 (quy định chưa đạt) + E10-T5 (ba mức + hai nhịp).
 *
 * `evaluateRules` chạy Ở ĐÂY, tại client, mỗi lần render — BR-051 Live
 * Composition Feedback đòi dòng "Còn thiếu" / "Nên có thêm" đổi NGAY khi bấm Chọn.
 *
 * Server VẪN đánh giá lại lúc Finalize (finalize-session.ts bước 5-6).
 *
 * KHÔNG MODAL (E5-T9 DoD). Mọi thứ hiện tại chỗ, ngay trên nút.
 */
export function FinalizeBar({
  selectedDishes,
  rules,
  targetDishCount = null,
  pending,
  error,
}: FinalizeBarProps): ReactElement {
  const [armed, setArmed] = useState(false)
  const [prevSelection, setPrevSelection] = useState(selectedDishes)

  // DEC-022 — đồng bộ khi render, không dùng Effect. Đổi món thì phải đọc lại
  // cảnh báo từ đầu (Guide §1.2).
  if (selectedDishes !== prevSelection) {
    setPrevSelection(selectedDishes)
    setArmed(false)
  }

  const evaluation = evaluateRules({ rules, dishes: selectedDishes, targetDishCount })
  const isEmpty = selectedDishes.length === 0
  const hasBlocking = evaluation.blocking.length > 0
  const hasWarnings = evaluation.warnings.length > 0
  const needsConfirm = hasWarnings && !armed && !hasBlocking && !isEmpty

  let buttonLabel = 'Chốt bữa'
  if (pending) {
    buttonLabel = 'Đang chốt…'
  } else if (isEmpty) {
    buttonLabel = 'Chọn món để chốt'
  } else if (hasBlocking) {
    buttonLabel = 'Chốt bữa'
  } else if (hasWarnings && armed) {
    const firstWarning = evaluation.warnings[0]
    let summary = ''
    if (firstWarning?.kind === 'PREFERRED_SHORTFALL') {
      summary = `thiếu ${ruleShortfallPhrase({ systemTag: firstWarning.systemTag, missing: firstWarning.missing })}`
    } else if (firstWarning?.kind === 'TARGET_COUNT') {
      if (firstWarning.direction === 'UNDER') {
        summary = `thiếu ${firstWarning.target - firstWarning.actual} món`
      } else {
        summary = `thừa ${firstWarning.actual - firstWarning.target} món`
      }
    }
    buttonLabel = `Vẫn chốt · ${summary}`
  } else {
    buttonLabel = 'Chốt bữa'
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (needsConfirm) {
      e.preventDefault()
      setArmed(true)
    }
  }

  const targetCountWarning = evaluation.warnings.find((w) => w.kind === 'TARGET_COUNT')

  return (
    <div className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-surface-raised px-4 pb-6 pt-4">
      <p className="text-body text-ink-muted">
        {isEmpty
          ? 'Chưa chọn món nào cho bữa này.'
          : selectedDishes.map((dish) => dish.name).join(' · ')}
      </p>

      {rules.length === 0 ? null : (
        <ul className="flex flex-col gap-1">
          {rules.map((rule) => {
            const shortfall = evaluation.blocking.find((s) => s.systemTag === rule.systemTag)
            const prefWarning = evaluation.warnings.find(
              (w) => w.kind === 'PREFERRED_SHORTFALL' && w.systemTag === rule.systemTag,
            )

            let borderClass = 'border-yes text-ink-muted'
            let statusText = 'đã đủ'

            if (shortfall !== undefined) {
              borderClass = 'border-border-strong text-ink'
              statusText = `còn thiếu ${ruleShortfallPhrase({ systemTag: shortfall.systemTag, missing: shortfall.missing })}`
            } else if (prefWarning !== undefined && prefWarning.kind === 'PREFERRED_SHORTFALL') {
              borderClass = 'border-warning text-ink'
              statusText = `nên có thêm ${ruleShortfallPhrase({ systemTag: prefWarning.systemTag, missing: prefWarning.missing })}`
            }

            return (
              <li
                key={`${rule.ruleType ?? 'REQUIRED'}-${rule.systemTag}`}
                className={`border-l-2 pl-3 text-caption ${borderClass}`}
              >
                {ruleSentence(rule)} · {statusText}
              </li>
            )
          })}
        </ul>
      )}

      {targetCountWarning !== undefined && targetCountWarning.kind === 'TARGET_COUNT' ? (
        <p className="border-l-2 border-warning pl-3 text-caption text-ink">
          Bạn chọn {targetCountWarning.actual} món · nhà mình thường ăn {targetCountWarning.target}
        </p>
      ) : null}

      <InlineError message={error} size="body" />

      {/* `muted` chứ KHÔNG `disabled`: nút chưa đủ điều kiện vẫn bấm được để
          bấm ra lỗi — Design Criteria §5, và `Button` đã có sẵn prop này. Một
          nút chết không nói cho người dùng biết vì sao nó chết. */}
      <input type="hidden" name="intent" value="finalize" />
      <Button type="submit" pending={pending} muted={isEmpty || hasBlocking} onClick={handleClick}>
        {buttonLabel}
      </Button>
    </div>
  )
}
