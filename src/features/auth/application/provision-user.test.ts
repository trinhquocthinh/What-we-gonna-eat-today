import { describe, expect, it } from 'vitest'

import { makeUser } from '@/shared/testing/factories'

import type { UserRepository } from './user-repository'
import { provisionUser } from './provision-user'

type Row = ReturnType<typeof makeUser> & { provider: string; providerSubject: string }

/**
 * Cổng giả: một mảng trong bộ nhớ cư xử đúng như hợp đồng của `UserRepository`
 * — khoá là `(provider, provider_subject)`, KHÔNG phải email. Đếm số lần gọi
 * `createFromProvider` để TC-002 kiểm được "không tạo User mới".
 */
function makeFakeUserRepository() {
  const rows: Row[] = []
  let createCalls = 0

  const repository: UserRepository = {
    async findByProviderIdentity(identity) {
      const found = rows.find(
        (row) =>
          row.provider === identity.provider && row.providerSubject === identity.providerSubject,
      )
      return found === undefined
        ? null
        : { id: found.id, displayName: found.displayName, email: found.email }
    },

    async createFromProvider(profile) {
      createCalls += 1
      const row: Row = {
        ...makeUser({
          id: `user-${rows.length + 1}`,
          displayName: profile.displayName,
          email: profile.email,
        }),
        provider: profile.provider,
        providerSubject: profile.providerSubject,
      }
      rows.push(row)
      return { id: row.id, displayName: row.displayName, email: row.email }
    },
  }

  return {
    repository,
    rows,
    get createCalls() {
      return createCalls
    },
  }
}

describe('SPEC-001 — Đăng nhập', () => {
  // Nửa "trả cookie phiên" của TC-001 do @auth/core lo (nó mã hoá token sau khi
  // callbacks.jwt trả về khác null). Tầng A không kiểm cookie được — bằng chứng
  // nằm ở smoke test thủ công, Implementation Guide §8.2 bước 7. Ghi ra để lỗ
  // hổng nhìn thấy được thay vì giả vờ đã phủ.

  it('TC-001: chưa có User nào, callback OAuth hợp lệ thì tạo đúng một User', async () => {
    const fake = makeFakeUserRepository()

    const result = await provisionUser(
      { users: fake.repository },
      {
        provider: 'google',
        providerSubject: '110000000000000000001',
        email: 'me@example.com',
        displayName: 'Mẹ',
      },
    )

    expect(result.ok).toBe(true)
    expect(fake.rows).toHaveLength(1)
    expect(fake.createCalls).toBe(1)
    expect(fake.rows[0]?.email).toBe('me@example.com')
  })

  it('TC-002: đã có User với provider_subject X, callback lại với X thì không tạo User mới', async () => {
    const fake = makeFakeUserRepository()
    const raw = {
      provider: 'google',
      providerSubject: '110000000000000000001',
      email: 'me@example.com',
      displayName: 'Mẹ',
    }

    const first = await provisionUser({ users: fake.repository }, raw)
    const createCallsAfterFirst = fake.createCalls

    const second = await provisionUser({ users: fake.repository }, raw)

    expect(fake.rows).toHaveLength(1)
    expect(fake.createCalls).toBe(createCallsAfterFirst)
    expect(first.ok && second.ok && first.value.id === second.value.id).toBe(true)
  })

  it('TC-003: hai provider account cùng email vẫn là hai User riêng biệt', async () => {
    const fake = makeFakeUserRepository()

    const first = await provisionUser(
      { users: fake.repository },
      {
        provider: 'google',
        providerSubject: 'SUBJECT-A',
        email: 'chung@example.com',
        displayName: 'Bố',
      },
    )
    const second = await provisionUser(
      { users: fake.repository },
      {
        provider: 'google',
        providerSubject: 'SUBJECT-B',
        email: 'chung@example.com',
        displayName: 'Mẹ',
      },
    )

    expect(fake.rows).toHaveLength(2)
    expect(first.ok && second.ok && first.value.id !== second.value.id).toBe(true)
  })

  it('TC-001b: thiếu provider_subject thì trả ERR_VALIDATION và không đụng tới repository', async () => {
    const fake = makeFakeUserRepository()

    const result = await provisionUser(
      { users: fake.repository },
      { provider: 'google', email: 'me@example.com', displayName: 'Mẹ' },
    )

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error.code).toBe('ERR_VALIDATION')
    expect(fake.rows).toHaveLength(0)
  })
})
