import { describe, expect, it } from 'vitest'

import type { GroupListItem, GroupRepository } from './group-repository'
import { listGroups } from './list-groups'

function makeFakeRepository(items: GroupListItem[]): GroupRepository {
  return {
    async createWithAdmin() {
      throw new Error('không dùng trong test này')
    },
    async listForUser() {
      return items
    },
    async findById() {
      return null
    },
  }
}

describe('listGroups', () => {
  it('chưa có nhóm nào thì trả mảng rỗng', async () => {
    expect(await listGroups({ groups: makeFakeRepository([]) }, 'user-1')).toEqual([])
  })

  it('giữ nguyên thứ tự port trả về — E1-T7 sẽ thêm luật sắp xếp', async () => {
    const items: GroupListItem[] = [
      { id: 'g1', name: 'Nhà Bảy Hiền', timezone: 'Asia/Saigon', memberCount: 4 },
      { id: 'g2', name: 'Nhà ngoại Cần Thơ', timezone: 'Asia/Saigon', memberCount: 5 },
    ]

    expect(await listGroups({ groups: makeFakeRepository(items) }, 'user-1')).toEqual(items)
  })
})
