import { describe, expect, it, vi } from 'vitest'

import { failure } from '@/shared/errors'
import { err, ok } from '@/shared/result'

import type { RuleRepository } from './rule-repository'
import { setGroupRules } from './set-group-rules'

function fakeRepository() {
  const replaceGroupRules = vi.fn(async () => {})
  const repository: RuleRepository = {
    listGroupRules: async () => [],
    replaceGroupRules,
    listSessionRules: async () => [],
  }
  return { repository, replaceGroupRules }
}

const allowAdmin = async () => ok(undefined)
const denyAdmin = async () => err(failure('ERR_NOT_GROUP_ADMIN'))

describe('setGroupRules', () => {
  // TC-085.
  it('lưu đúng một rule', async () => {
    const { repository, replaceGroupRules } = fakeRepository()

    const result = await setGroupRules(
      { rules: repository, assertAdmin: allowAdmin },
      { groupId: 'g1', rules: [{ systemTag: 'SOUP', minimumCount: 1 }], requestedByUserId: 'u1' },
    )

    expect(result.ok).toBe(true)
    expect(replaceGroupRules).toHaveBeenCalledWith(
      'g1',
      [{ systemTag: 'SOUP', minimumCount: 1, ruleType: 'REQUIRED' }],
      undefined,
    )
  })

  // TC-088 — mảng rỗng vẫn phải GỌI repo (xoá sạch), không được "tối ưu" bỏ qua.
  it('gọi repo với mảng rỗng để gỡ hết quy định', async () => {
    const { repository, replaceGroupRules } = fakeRepository()

    await setGroupRules(
      { rules: repository, assertAdmin: allowAdmin },
      { groupId: 'g1', rules: [], requestedByUserId: 'u1' },
    )

    expect(replaceGroupRules).toHaveBeenCalledWith('g1', [], undefined)
  })

  // TC-086.
  it('trả ERR_INVALID_MINIMUM_COUNT và không ghi gì', async () => {
    const { repository, replaceGroupRules } = fakeRepository()

    const result = await setGroupRules(
      { rules: repository, assertAdmin: allowAdmin },
      { groupId: 'g1', rules: [{ systemTag: 'MAIN', minimumCount: 0 }], requestedByUserId: 'u1' },
    )

    expect(result).toEqual({
      ok: false,
      error: { code: 'ERR_INVALID_MINIMUM_COUNT', details: { field: 'rules' } },
    })
    expect(replaceGroupRules).not.toHaveBeenCalled()
  })

  // TC-087.
  it('trả ERR_DUPLICATE_RULE và không ghi gì', async () => {
    const { repository, replaceGroupRules } = fakeRepository()

    const result = await setGroupRules(
      { rules: repository, assertAdmin: allowAdmin },
      {
        groupId: 'g1',
        rules: [
          { systemTag: 'MAIN', minimumCount: 1 },
          { systemTag: 'MAIN', minimumCount: 1 },
        ],
        requestedByUserId: 'u1',
      },
    )

    expect(result.ok).toBe(false)
    expect(replaceGroupRules).not.toHaveBeenCalled()
  })

  // TC-089 — Member không phải Admin. Guard chạy TRƯỚC validate: input sai
  // cũng không được lộ ra là sai, vì người này không có quyền hỏi.
  it('trả ERR_NOT_GROUP_ADMIN trước cả khi validate', async () => {
    const { repository, replaceGroupRules } = fakeRepository()

    const result = await setGroupRules(
      { rules: repository, assertAdmin: denyAdmin },
      { groupId: 'g1', rules: [{ systemTag: 'MAIN', minimumCount: 0 }], requestedByUserId: 'u9' },
    )

    expect(result).toEqual({ ok: false, error: { code: 'ERR_NOT_GROUP_ADMIN' } })
    expect(replaceGroupRules).not.toHaveBeenCalled()
  })
})
