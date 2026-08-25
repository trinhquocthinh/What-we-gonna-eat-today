import { describe, expect, it } from 'vitest'

import { countTone } from './count-tone'

describe('countTone (E5-T7 DoD: số 0 hiện mờ chứ không ẩn)', () => {
  it('0 → mờ: trả về text-ink-muted bất kể tone', () => {
    expect(countTone(0, 'yes')).toBe('text-ink-muted')
    expect(countTone(0, 'neutral')).toBe('text-ink-muted')
  })

  it('số 0 KHÔNG dùng ink-faint — trượt chuẩn tương phản §8', () => {
    expect(countTone(0, 'yes')).not.toContain('ink-faint')
    expect(countTone(0, 'neutral')).not.toContain('ink-faint')
  })

  it('≠0: tone="yes" trả về text-yes font-medium, tone="neutral" trả về text-ink', () => {
    const yesTone = countTone(3, 'yes')
    expect(yesTone).toContain('text-yes')
    expect(yesTone).not.toContain('text-ink-faint')

    const neutralTone = countTone(1, 'neutral')
    expect(neutralTone).toContain('text-ink')
    expect(neutralTone).not.toContain('text-ink-faint')
  })

  it('không đỏ: không có giá trị nào trả về chuỗi chứa "no" hoặc "red"', () => {
    const tones = ['yes', 'neutral'] as const
    const sampleValues = [0, 1, 2, 5, 10]

    for (const tone of tones) {
      for (const val of sampleValues) {
        const result = countTone(val, tone)
        expect(result).not.toContain('text-no')
        expect(result).not.toContain('text-red')
        expect(result).not.toContain('danger')
      }
    }
  })
})
