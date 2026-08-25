import { describe, expect, it } from 'vitest'

import { failure } from './index'

describe('failure', () => {
  it('không gắn key `details` khi không truyền — exactOptionalPropertyTypes', () => {
    expect(Object.hasOwn(failure('ERR_VALIDATION'), 'details')).toBe(false)
  })

  it('giữ nguyên details khi có truyền', () => {
    expect(failure('ERR_VALIDATION', { field: 'email' })).toEqual({
      code: 'ERR_VALIDATION',
      details: { field: 'email' },
    })
  })
})
