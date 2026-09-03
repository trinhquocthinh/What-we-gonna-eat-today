import type { SystemTag } from '@/shared/domain/system-tag'
import { ruleShortfallPhrase, TAG_IN_SENTENCE } from '@/shared/ui/system-tag-label'

export { ruleShortfallPhrase }

/**
 * "Phải có ít nhất 1 món canh" hoặc "Nên có ít nhất 2 món mặn" — mockup S-07 + E10-T1.
 */
export function ruleSentence(rule: {
  systemTag: SystemTag
  minimumCount: number
  ruleType?: 'REQUIRED' | 'PREFERRED'
}): string {
  const prefix = rule.ruleType === 'PREFERRED' ? 'Nên có ít nhất' : 'Phải có ít nhất'
  return `${prefix} ${rule.minimumCount} ${TAG_IN_SENTENCE[rule.systemTag]}`
}
