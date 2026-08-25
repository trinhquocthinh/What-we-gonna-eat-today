import type { SystemTag } from '@/shared/domain/system-tag'
import { ruleShortfallPhrase, TAG_IN_SENTENCE } from '@/shared/ui/system-tag-label'

export { ruleShortfallPhrase }

/** "Phải có ít nhất 1 món canh" — nguyên văn mockup S-07. */
export function ruleSentence(rule: { systemTag: SystemTag; minimumCount: number }): string {
  return `Phải có ít nhất ${rule.minimumCount} ${TAG_IN_SENTENCE[rule.systemTag]}`
}
