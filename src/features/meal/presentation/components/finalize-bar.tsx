'use client'

import type { ReactElement } from 'react'

import { evaluateRules, type RequiredRule } from '@/features/rule/domain/evaluate'
import {
  ruleSentence,
  ruleShortfallPhrase,
} from '@/features/rule/presentation/components/rule-sentence'
import { Button } from '@/shared/ui/button'
import { InlineError } from '@/shared/ui/inline-error'
import type { SystemTag } from '@/shared/domain/system-tag'

export type FinalizeBarProps = {
  selectedDishes: readonly { dishId: string; name: string; systemTags: readonly SystemTag[] }[]
  rules: readonly RequiredRule[]
  pending: boolean
  error: string | null
}

/**
 * S-10 dải đáy. E5-T8 (khay) + E5-T9 (quy định chưa đạt) trong một component
 * vì chúng là MỘT câu nói với người dùng: "đây là những gì bạn chọn, và đây là
 * chỗ còn thiếu".
 *
 * `evaluateRules` chạy Ở ĐÂY, tại client, mỗi lần render — BR-051 Live
 * Composition Feedback đòi dòng "Còn thiếu" đổi NGAY khi bấm Chọn, không chờ
 * round-trip. Hàm thuần ở `rule/domain` nên chạy được ở client; chiều
 * `meal → rule` đã có sẵn trong ALLOWED_CROSS_FEATURE từ E0 (Guide §1.4).
 *
 * Server VẪN đánh giá lại lúc Finalize (finalize-session.ts bước 5-6). Hai lần
 * không thừa: client cho tức thì, server cho đúng. Lệch nhau thì server thắng.
 *
 * KHÔNG MODAL (E5-T9 DoD). Mọi thứ hiện tại chỗ, ngay trên nút.
 */
export function FinalizeBar({
  selectedDishes,
  rules,
  pending,
  error,
}: FinalizeBarProps): ReactElement {
  const evaluation = evaluateRules({ rules, dishes: selectedDishes, targetDishCount: null })
  const isEmpty = selectedDishes.length === 0

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
            return (
              <li
                key={rule.systemTag}
                className={`border-l-2 pl-3 text-caption ${
                  shortfall === undefined
                    ? 'border-yes text-ink-muted'
                    : 'border-border-strong text-ink'
                }`}
              >
                {ruleSentence(rule)} ·{' '}
                {shortfall === undefined
                  ? 'đã đủ'
                  : `còn thiếu ${ruleShortfallPhrase({ systemTag: shortfall.systemTag, missing: shortfall.missing })}`}
              </li>
            )
          })}
        </ul>
      )}

      <InlineError message={error} size="body" />

      {/* `muted` chứ KHÔNG `disabled`: nút chưa đủ điều kiện vẫn bấm được để
          bấm ra lỗi — Design Criteria §5, và `Button` đã có sẵn prop này. Một
          nút chết không nói cho người dùng biết vì sao nó chết. */}
      <input type="hidden" name="intent" value="finalize" />
      <Button type="submit" pending={pending} muted={isEmpty || evaluation.blocking.length > 0}>
        {pending ? 'Đang chốt…' : isEmpty ? 'Chọn món để chốt' : 'Chốt bữa'}
      </Button>
    </div>
  )
}
