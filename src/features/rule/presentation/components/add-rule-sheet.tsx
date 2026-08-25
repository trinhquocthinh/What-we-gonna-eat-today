'use client'

import { useState, type ReactElement } from 'react'

import { SYSTEM_TAGS, type SystemTag } from '@/shared/domain/system-tag'
import { Button } from '@/shared/ui/button'
import { Sheet } from '@/shared/ui/sheet'

import { ruleSentence } from './rule-sentence'

export type AddRuleSheetProps = {
  usedTags: ReadonlySet<SystemTag>
  onAdd: (rule: { systemTag: SystemTag; minimumCount: number }) => void
  onClose: () => void
}

export function AddRuleSheet({ usedTags, onAdd, onClose }: AddRuleSheetProps): ReactElement {
  const available = SYSTEM_TAGS.filter((tag) => !usedTags.has(tag))
  const [systemTag, setSystemTag] = useState<SystemTag | null>(available[0] ?? null)
  const [minimumCount, setMinimumCount] = useState(1)

  return (
    <Sheet title="Thêm quy định" onClose={onClose}>
      <h2 className="text-title font-semibold text-ink">Thêm quy định</h2>

      {systemTag === null ? (
        <p className="text-body text-ink-muted">Mọi nhãn đều đã có quy định rồi.</p>
      ) : (
        <>
          <fieldset className="flex flex-col gap-2 border-0 p-0">
            <legend className="text-caption font-medium text-ink-muted">Nhãn món</legend>
            <div className="flex flex-wrap gap-2">
              {available.map((tag) => (
                <label
                  key={tag}
                  className={`flex min-h-11 cursor-pointer items-center rounded-chip px-4 text-body font-medium ${
                    tag === systemTag
                      ? 'bg-accent text-on-accent'
                      : 'border border-border bg-surface-raised text-ink'
                  }`}
                >
                  <input
                    type="radio"
                    name="newRuleTag"
                    value={tag}
                    checked={tag === systemTag}
                    onChange={() => setSystemTag(tag)}
                    className="sr-only"
                  />
                  {ruleSentence({ systemTag: tag, minimumCount }).replace('Phải có ít nhất 1 ', '')}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center justify-between gap-3">
            <span className="text-body text-ink">Ít nhất bao nhiêu món</span>
            <input
              type="number"
              min={1}
              max={9}
              value={minimumCount}
              onChange={(event) => setMinimumCount(Number(event.target.value))}
              className="min-h-11 w-20 rounded-control border border-border bg-surface-raised px-3 text-right text-body tabular-nums text-ink"
            />
          </label>

          <p className="text-caption text-ink-muted">{ruleSentence({ systemTag, minimumCount })}</p>

          <Button
            type="button"
            muted={!Number.isInteger(minimumCount) || minimumCount < 1}
            onClick={() => onAdd({ systemTag, minimumCount })}
          >
            Thêm vào danh sách
          </Button>
        </>
      )}
    </Sheet>
  )
}
