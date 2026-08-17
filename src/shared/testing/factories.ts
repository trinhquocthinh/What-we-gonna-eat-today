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
