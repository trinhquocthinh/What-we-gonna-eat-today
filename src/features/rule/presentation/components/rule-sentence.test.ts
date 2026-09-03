import { describe, expect, it } from 'vitest'
import { ruleSentence, ruleShortfallPhrase } from './rule-sentence'

describe('ruleSentence', () => {
  it('định dạng đúng câu cho 5 tag', () => {
    expect(ruleSentence({ systemTag: 'STAPLE', minimumCount: 1 })).toBe(
      'Phải có ít nhất 1 món cơm/bún',
    )
    expect(ruleSentence({ systemTag: 'MAIN', minimumCount: 1 })).toBe('Phải có ít nhất 1 món mặn')
    expect(ruleSentence({ systemTag: 'SIDE', minimumCount: 1 })).toBe('Phải có ít nhất 1 món phụ')
    expect(ruleSentence({ systemTag: 'SOUP', minimumCount: 1 })).toBe('Phải có ít nhất 1 món canh')
    expect(ruleSentence({ systemTag: 'DESSERT', minimumCount: 1 })).toBe(
      'Phải có ít nhất 1 món tráng miệng',
    )
  })

  it('định dạng đúng số lượng > 1', () => {
    expect(ruleSentence({ systemTag: 'SOUP', minimumCount: 2 })).toBe('Phải có ít nhất 2 món canh')
  })

  it('định dạng đúng câu cho PREFERRED rule ("Nên có ít nhất")', () => {
    expect(ruleSentence({ systemTag: 'MAIN', minimumCount: 2, ruleType: 'PREFERRED' })).toBe(
      'Nên có ít nhất 2 món mặn',
    )
    expect(ruleSentence({ systemTag: 'SOUP', minimumCount: 1, ruleType: 'PREFERRED' })).toBe(
      'Nên có ít nhất 1 món canh',
    )
  })
})

describe('ruleShortfallPhrase', () => {
  it('định dạng cụm thiếu cho S4', () => {
    expect(ruleShortfallPhrase({ systemTag: 'SOUP', missing: 1 })).toBe('1 món canh')
    expect(ruleShortfallPhrase({ systemTag: 'MAIN', missing: 2 })).toBe('2 món mặn')
  })
})
