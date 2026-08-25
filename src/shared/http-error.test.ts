import { describe, expect, it } from 'vitest'

import { httpStatusForErrorCode } from './http-error'

describe('httpStatusForErrorCode', () => {
  it('mã liên quan tới S5 trả đúng status', () => {
    expect(httpStatusForErrorCode('ERR_UNAUTHENTICATED')).toBe(401)
    expect(httpStatusForErrorCode('ERR_NOT_PARTICIPANT')).toBe(403)
    expect(httpStatusForErrorCode('ERR_SESSION_NOT_ACTIVE')).toBe(409)
    expect(httpStatusForErrorCode('ERR_DISH_NOT_IN_POOL')).toBe(409)
    expect(httpStatusForErrorCode('ERR_VALIDATION')).toBe(400)
  })
})
