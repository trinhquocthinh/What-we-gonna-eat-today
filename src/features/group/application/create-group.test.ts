import { describe, expect, it } from 'vitest'

import { makeGroup } from '@/shared/testing/factories'

import type { GroupListItem, GroupRepository, NewGroupWithAdmin } from './group-repository'
import { createGroup } from './create-group'

type Row = NewGroupWithAdmin & { id: string; isAdmin: boolean }

/** Cổng giả là object thuần, không auto-mock (Test Cases §1.3). */
function makeFakeGroupRepository() {
  const rows: Row[] = []

  const repository: GroupRepository = {
    async createWithAdmin(input) {
      const id = `group-${rows.length + 1}`
      rows.push({ ...input, id, isAdmin: true })
      return { id, name: input.name, timezone: input.timezone }
    },
    async listForUser(): Promise<GroupListItem[]> {
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        timezone: row.timezone,
        memberCount: 1,
      }))
    },
    async findById(groupId) {
      const found = rows.find((row) => row.id === groupId)
      return found === undefined
        ? null
        : { id: found.id, name: found.name, timezone: found.timezone }
    },
  }

  return { repository, rows }
}

const CREATOR = makeGroup().creatorUserId

describe('SPEC-002 — Tạo Group', () => {
  it('TC-008: tạo Group hợp lệ thì người tạo là Member và có is_admin', async () => {
    const fake = makeFakeGroupRepository()

    const result = await createGroup(
      { groups: fake.repository },
      { creatorUserId: CREATOR, name: 'Nhà Bảy Hiền', timezone: 'Asia/Ho_Chi_Minh' },
    )

    expect(result.ok).toBe(true)
    expect(fake.rows).toHaveLength(1)
    expect(fake.rows[0]?.creatorUserId).toBe(CREATOR)
    expect(fake.rows[0]?.isAdmin).toBe(true)
    // Canonical hoá xảy ra ở domain, use case chỉ chuyển tiếp.
    expect(fake.rows[0]?.timezone).toBe('Asia/Saigon')
  })

  it('TC-009: timezone sai thì ERR_VALIDATION và KHÔNG ghi DB', async () => {
    const fake = makeFakeGroupRepository()

    const result = await createGroup(
      { groups: fake.repository },
      { creatorUserId: CREATOR, name: 'Nhà Bảy Hiền', timezone: 'Asia/Saigon_typo' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_VALIDATION')
    expect(fake.rows).toHaveLength(0)
  })

  it('TC-010: tên toàn khoảng trắng thì ERR_VALIDATION', async () => {
    const fake = makeFakeGroupRepository()

    const result = await createGroup(
      { groups: fake.repository },
      { creatorUserId: CREATOR, name: '   ', timezone: 'Asia/Ho_Chi_Minh' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_VALIDATION')
    expect(result.ok === false && result.error.details?.['field']).toBe('groupName')
    expect(fake.rows).toHaveLength(0)
  })
})
