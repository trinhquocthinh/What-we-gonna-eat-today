/**
 * Test Cases §1.3 — factory dữ liệu test gom về một chỗ.
 *
 * Cố ý KHÔNG import type từ `features/*`: `shared/` phụ thuộc ngược vào
 * `features/` là sai chiều kiến trúc. Kiểu khớp về cấu trúc, và `tsc` bắt được
 * ngay tại chỗ dùng nếu hai bên lệch nhau.
 */
export type TestUser = {
  id: string
  displayName: string
  email: string
}

export function makeUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: '01920000-0000-7000-8000-000000000001',
    displayName: 'Mẹ',
    email: 'me@example.com',
    ...overrides,
  }
}

export type TestGroup = {
  id: string
  name: string
  timezone: string
  creatorUserId: string
}

export function makeGroup(overrides: Partial<TestGroup> = {}): TestGroup {
  return {
    id: '01920000-0000-7000-8000-0000000000a1',
    name: 'Nhà Bảy Hiền',
    timezone: 'Asia/Ho_Chi_Minh',
    creatorUserId: '01920000-0000-7000-8000-000000000001',
    ...overrides,
  }
}

export type TestMembership = {
  isAdmin: boolean
  removedAt: Date | null
}

export function makeMembership(overrides: Partial<TestMembership> = {}): TestMembership {
  return { isAdmin: false, removedAt: null, ...overrides }
}

export type TestGroupDish = {
  id: string
  name: string
}

/**
 * Test Cases §1.4 nêu `makeGroupDish({ systemTags: ['MAIN'] })`. Trường
 * `systemTags` CỐ Ý chưa có ở đây: bảng `group_dish_tags` và use case gán tag
 * thuộc E2-T5, nên một trường không test nào dùng được là dữ liệu giả không ai
 * kiểm chứng — mà factory này không import type từ `features/` (khớp cấu trúc,
 * `tsc` chỉ bắt được tại CHỖ DÙNG), nên không có lưới nào đỡ.
 *
 * E2-T5: thêm `systemTags: SystemTag[]` mặc định `[]`.
 */
export function makeGroupDish(overrides: Partial<TestGroupDish> = {}): TestGroupDish {
  return {
    id: '01920000-0000-7000-8000-0000000000d1',
    name: 'Cá basa kho tiêu',
    ...overrides,
  }
}

export type TestSession = {
  id: string
  groupId: string
  decisionDate: string
  state: 'DRAFT' | 'ACTIVE'
}

export function makeSession(overrides: Partial<TestSession> = {}): TestSession {
  return {
    id: '01920000-0000-7000-8000-0000000000b1',
    groupId: '01920000-0000-7000-8000-0000000000a1',
    decisionDate: '2026-08-17',
    state: 'DRAFT',
    ...overrides,
  }
}

export type TestParticipant = {
  id: string
  sessionId: string
  userId: string
  state: 'ACTIVE'
}

export function makeParticipant(overrides: Partial<TestParticipant> = {}): TestParticipant {
  return {
    id: '01920000-0000-7000-8000-0000000000c1',
    sessionId: '01920000-0000-7000-8000-0000000000b1',
    userId: '01920000-0000-7000-8000-000000000001',
    state: 'ACTIVE',
    ...overrides,
  }
}

export type TestInvite = {
  id: string
  groupId: string
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
}

export function makeInvite(overrides: Partial<TestInvite> = {}): TestInvite {
  return {
    id: '01920000-0000-7000-8000-0000000000e1',
    groupId: '01920000-0000-7000-8000-0000000000a1',
    tokenHash: 'test-hash',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    usedAt: null,
    ...overrides,
  }
}
