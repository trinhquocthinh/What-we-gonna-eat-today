import { describe, expect, it } from 'vitest'

import { readProviderProfile } from './provider-identity'

describe('readProviderProfile', () => {
  it('đọc được profile đủ trường', () => {
    expect(
      readProviderProfile({
        provider: 'google',
        providerSubject: '110000000000000000001',
        email: 'me@example.com',
        displayName: 'Mẹ',
      }),
    ).toEqual({
      provider: 'google',
      providerSubject: '110000000000000000001',
      email: 'me@example.com',
      displayName: 'Mẹ',
    })
  })

  it('trả null khi thiếu provider_subject — khoá định danh không đủ', () => {
    expect(
      readProviderProfile({ provider: 'google', email: 'me@example.com', displayName: 'Mẹ' }),
    ).toBeNull()
  })

  it('trả null khi provider chỉ toàn khoảng trắng', () => {
    expect(
      readProviderProfile({
        provider: '   ',
        providerSubject: '1',
        email: 'me@example.com',
        displayName: 'Mẹ',
      }),
    ).toBeNull()
  })

  it('trả null khi thiếu email', () => {
    expect(readProviderProfile({ provider: 'google', providerSubject: '1' })).toBeNull()
  })

  it('chuẩn hoá email: cắt khoảng trắng và hạ về chữ thường', () => {
    const profile = readProviderProfile({
      provider: 'google',
      providerSubject: '1',
      email: '  Me@Example.COM ',
      displayName: 'Mẹ',
    })

    expect(profile?.email).toBe('me@example.com')
  })

  it('dùng email làm display_name khi provider không trả tên', () => {
    const profile = readProviderProfile({
      provider: 'google',
      providerSubject: '1',
      email: 'me@example.com',
      displayName: null,
    })

    expect(profile?.displayName).toBe('me@example.com')
  })
})
