'use client'

import { useActionState, useState, type ReactElement } from 'react'

import type { SystemTag } from '@/shared/domain/system-tag'
import { Button } from '@/shared/ui/button'
import { EmptyStateCard } from '@/shared/ui/empty-state-card'
import { InlineError } from '@/shared/ui/inline-error'

import { AddRuleSheet } from './add-rule-sheet'
import { ruleSentence } from './rule-sentence'

export type RuleFormState = { error: string | null; savedAt: number | null }

export type GroupRuleItem = {
  systemTag: SystemTag
  minimumCount: number
  ruleType: 'REQUIRED' | 'PREFERRED'
}

export type GroupRulesScreenProps = {
  groupName: string
  initialRules: readonly {
    systemTag: SystemTag
    minimumCount: number
    ruleType?: 'REQUIRED' | 'PREFERRED'
  }[]
  initialTargetDishCount?: number | null
  /** Member vẫn XEM được quy định; chỉ Admin mới thấy nút sửa (BR-010). */
  canEdit: boolean
  action: (state: RuleFormState, formData: FormData) => Promise<RuleFormState>
}

const EMPTY_STATE: RuleFormState = { error: null, savedAt: null }

/**
 * S-07 — Quy định bữa ăn (E10-T1 + E10-T3).
 *
 * Hai nhóm: "Bắt buộc" (Required Rule) và "Nên có" (Preferred Rule).
 * Form sử dụng trường ghép `ruleType:systemTag:minimumCount` để chống lệch hàng.
 * Kèm ô cấu hình Target Dish Count cho nhóm.
 */
export function GroupRulesScreen({
  groupName,
  initialRules,
  initialTargetDishCount = null,
  canEdit,
  action,
}: GroupRulesScreenProps): ReactElement {
  const [rules, setRules] = useState<readonly GroupRuleItem[]>(() =>
    initialRules.map((r) => ({
      systemTag: r.systemTag,
      minimumCount: r.minimumCount,
      ruleType: r.ruleType ?? 'REQUIRED',
    })),
  )
  const [sheetType, setSheetType] = useState<'REQUIRED' | 'PREFERRED' | null>(null)
  const [state, formAction, pending] = useActionState(action, EMPTY_STATE)

  const requiredRules = rules.filter((r) => r.ruleType === 'REQUIRED')
  const preferredRules = rules.filter((r) => r.ruleType === 'PREFERRED')

  const usedRequiredTags = new Set(requiredRules.map((rule) => rule.systemTag))
  const usedPreferredTags = new Set(preferredRules.map((rule) => rule.systemTag))

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex flex-col gap-1 px-4 pb-3 pt-6">
        <span className="text-caption font-medium text-ink-muted">{groupName}</span>
        <h1 className="text-title font-semibold text-ink">Quy định bữa ăn</h1>
      </header>

      <form action={formAction} className="flex flex-1 flex-col gap-4 px-4">
        {/* Nhóm Bắt buộc */}
        {requiredRules.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-subtitle font-semibold text-ink">Bắt buộc</h2>
            <div className="flex flex-col gap-2">
              {requiredRules.map((rule) => (
                <div
                  key={`${rule.ruleType}:${rule.systemTag}`}
                  className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface-raised px-5 py-4"
                >
                  <input
                    type="hidden"
                    name="rule"
                    value={`${rule.ruleType}:${rule.systemTag}:${rule.minimumCount}`}
                  />
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
            </div>
          </div>
        ) : null}

        {/* Nhóm Nên có */}
        {preferredRules.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-subtitle font-semibold text-ink">Nên có</h2>
            <div className="flex flex-col gap-2">
              {preferredRules.map((rule) => (
                <div
                  key={`${rule.ruleType}:${rule.systemTag}`}
                  className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface-raised px-5 py-4"
                >
                  <input
                    type="hidden"
                    name="rule"
                    value={`${rule.ruleType}:${rule.systemTag}:${rule.minimumCount}`}
                  />
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
            </div>
          </div>
        ) : null}

        {/* Cả hai nhóm rỗng */}
        {rules.length === 0 ? (
          <EmptyStateCard
            title="Chưa có quy định nào"
            description="Chưa có quy định nào. Lúc chốt bữa sẽ không có gì được kiểm tra — thiếu canh hay thiếu món mặn cũng chốt được."
          />
        ) : null}

        {/* Cấu hình Target Dish Count (E10-T3) */}
        <div className="flex flex-col gap-1 rounded-card border border-border bg-surface-raised p-4">
          <label htmlFor="targetDishCount" className="text-subtitle font-semibold text-ink">
            Số món thường ăn mỗi bữa
          </label>
          <span className="text-caption text-ink-muted">Để trống nếu nhà mình không cố định</span>
          <input
            id="targetDishCount"
            name="targetDishCount"
            type="number"
            min={1}
            max={20}
            defaultValue={initialTargetDishCount ?? ''}
            disabled={!canEdit}
            placeholder="Ví dụ: 4"
            className="mt-2 min-h-11 w-full rounded-control border border-border bg-surface px-3 text-body tabular-nums text-ink disabled:opacity-50"
          />
        </div>

        <p className="text-caption text-ink-muted">
          Quy định chỉ kiểm tra lúc chốt bữa, không chặn ai vuốt.
        </p>

        <InlineError message={state.error} size="body" />

        {canEdit ? (
          <div className="mt-auto flex flex-col gap-3 pb-6 pt-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setSheetType('REQUIRED')}
              >
                Thêm quy định bắt buộc
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setSheetType('PREFERRED')}
              >
                Thêm quy định nên có
              </Button>
            </div>
            <Button type="submit" pending={pending}>
              {pending ? 'Đang lưu…' : 'Lưu quy định'}
            </Button>
          </div>
        ) : null}
      </form>

      {sheetType !== null ? (
        <AddRuleSheet
          usedTags={sheetType === 'REQUIRED' ? usedRequiredTags : usedPreferredTags}
          ruleType={sheetType}
          onAdd={(newRule) => {
            setRules((current) => [...current, newRule])
            setSheetType(null)
          }}
          onClose={() => setSheetType(null)}
        />
      ) : null}
    </main>
  )
}
