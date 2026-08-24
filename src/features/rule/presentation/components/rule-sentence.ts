import type { SystemTag } from '@/shared/domain/system-tag'

/** Nhãn dùng TRONG CÂU, viết thường — "Phải có ít nhất 1 món canh". Khác
 *  `SYSTEM_TAG_LABELS` của feature `dish` (nhãn đứng một mình trên chip, viết
 *  hoa đầu). Hai bảng khác nhau vì hai ngữ cảnh khác nhau, không phải trùng
 *  lặp — E6-T2 gom mọi chuỗi tiếng Việt thì mang cả hai đi cùng. */
const TAG_IN_SENTENCE: Record<SystemTag, string> = {
  STAPLE: 'món cơm',
  MAIN: 'món mặn',
  SIDE: 'món phụ',
  SOUP: 'món canh',
  DESSERT: 'món tráng miệng',
}

/** "Phải có ít nhất 1 món canh" — nguyên văn mockup S-07. */
export function ruleSentence(rule: { systemTag: SystemTag; minimumCount: number }): string {
  return `Phải có ít nhất ${rule.minimumCount} ${TAG_IN_SENTENCE[rule.systemTag]}`
}

/** "1 món canh" — mảnh dùng trong dòng "Còn thiếu: …" ở S4 (E5-T9). */
export function ruleShortfallPhrase(shortfall: { systemTag: SystemTag; missing: number }): string {
  return `${shortfall.missing} ${TAG_IN_SENTENCE[shortfall.systemTag]}`
}
