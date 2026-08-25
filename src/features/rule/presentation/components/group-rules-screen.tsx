'use client'

import { useActionState, useState, type ReactElement } from 'react'

import type { SystemTag } from '@/shared/domain/system-tag'
import { Button } from '@/shared/ui/button'
import { EmptyStateCard } from '@/shared/ui/empty-state-card'
import { InlineError } from '@/shared/ui/inline-error'

import { AddRuleSheet } from './add-rule-sheet'
import { ruleSentence } from './rule-sentence'

export type RuleFormState = { error: string | null; savedAt: number | null }

export type GroupRulesScreenProps = {
  groupName: string
  initialRules: readonly { systemTag: SystemTag; minimumCount: number }[]
  /** Member vẫn XEM được quy định; chỉ Admin mới thấy nút sửa (BR-010). */
  canEdit: boolean
  action: (state: RuleFormState, formData: FormData) => Promise<RuleFormState>
}

const EMPTY_STATE: RuleFormState = { error: null, savedAt: null }

/**
 * S-07. CHỈ dựng nhóm "Bắt buộc" — nhóm "Nên có" trong mockup là Preferred
 * Rule (F22, v1.1), và một mục trống mang tiêu đề "Nên có" là lời hứa v1.0
 * không giữ được (Guide §1.4).
 *
 * Danh sách rule sống ở state client, submit một lần cho cả danh sách: SPEC-021
 * là "ghi đè toàn bộ", nên "Gỡ" và "Thêm" là hai cách sửa CÙNG một giá trị chứ
 * không phải hai thao tác server khác nhau.
 */
export function GroupRulesScreen({
  groupName,
  initialRules,
  canEdit,
  action,
}: GroupRulesScreenProps): ReactElement {
  const [rules, setRules] = useState(initialRules)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [state, formAction, pending] = useActionState(action, EMPTY_STATE)

  const usedTags = new Set(rules.map((rule) => rule.systemTag))

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex flex-col gap-1 px-4 pb-3 pt-6">
        <span className="text-caption font-medium text-ink-muted">{groupName}</span>
        <h1 className="text-title font-semibold text-ink">Quy định bữa ăn</h1>
      </header>

      <form action={formAction} className="flex flex-1 flex-col gap-4 px-4">
        {rules.map((rule) => (
          <div
            key={rule.systemTag}
            className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface-raised px-5 py-4"
          >
            <input type="hidden" name="systemTag" value={rule.systemTag} />
            <input type="hidden" name="minimumCount" value={rule.minimumCount} />
            <span className="text-subtitle font-semibold text-ink">{ruleSentence(rule)}</span>
            {canEdit ? (
              <Button
                type="button"
                variant="quiet"
                size="sm"
                onClick={() => setRules((current) => current.filter((r) => r !== rule))}
              >
                Gỡ
              </Button>
            ) : null}
          </div>
        ))}

        {rules.length === 0 ? (
          <EmptyStateCard
            title="Chưa có quy định nào"
            description="Chưa có quy định nào. Lúc chốt bữa sẽ không có gì được kiểm tra — thiếu canh hay thiếu món mặn cũng chốt được."
          />
        ) : null}

        <p className="text-caption text-ink-muted">
          Quy định chỉ kiểm tra lúc chốt bữa, không chặn ai vuốt.
        </p>

        <InlineError message={state.error} size="body" />

        {canEdit ? (
          <div className="mt-auto flex flex-col gap-3 pb-6 pt-3">
            <Button type="button" variant="secondary" onClick={() => setSheetOpen(true)}>
              Thêm quy định
            </Button>
            <Button type="submit" pending={pending}>
              {pending ? 'Đang lưu…' : 'Lưu quy định'}
            </Button>
          </div>
        ) : null}
      </form>

      {sheetOpen ? (
        <AddRuleSheet
          usedTags={usedTags}
          onAdd={(rule) => {
            setRules((current) => [...current, rule])
            setSheetOpen(false)
          }}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}
    </main>
  )
}
