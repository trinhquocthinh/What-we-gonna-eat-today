import { describe, expect, it, vi } from 'vitest'

import { listGroupRules } from './list-group-rules'
import type { GroupRuleRecord, RuleRepository } from './rule-repository'

describe('listGroupRules (SPEC-021)', () => {
  it('chuyển tiếp đúng groupId tới repository và trả về danh sách quy định', async () => {
    const fakeRules: GroupRuleRecord[] = [
      {
        id: 'r1',
        systemTag: 'SOUP',
        minimumCount: 1,
      },
    ]

    const listGroupRulesMock = vi.fn(async (_groupId: string) => fakeRules)
    const repository: RuleRepository = {
      listGroupRules: listGroupRulesMock,
      replaceGroupRules: vi.fn(async () => {}),
      listSessionRules: vi.fn(async () => []),
    }

    const result = await listGroupRules({ rules: repository }, 'g1')

    expect(result).toBe(fakeRules)
    expect(listGroupRulesMock).toHaveBeenCalledWith('g1')
  })
})
