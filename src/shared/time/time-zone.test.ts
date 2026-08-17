import { describe, expect, it } from 'vitest'

import { canonicalTimeZone, formatTimeZoneLabel, isValidTimeZone } from './time-zone'

const NOW = new Date('2026-08-18T10:00:00Z')

describe('isValidTimeZone', () => {
  // Test này tồn tại để chặn một "tối ưu" cụ thể: đổi sang
  // Intl.supportedValuesOf().includes() sẽ làm dòng đầu tiên đỏ.
  it('chấp nhận Asia/Ho_Chi_Minh dù supportedValuesOf không liệt kê nó', () => {
    expect(isValidTimeZone('Asia/Ho_Chi_Minh')).toBe(true)
    expect(Intl.supportedValuesOf('timeZone').includes('Asia/Ho_Chi_Minh')).toBe(false)
  })

  it('chấp nhận dạng canonical và UTC', () => {
    expect(isValidTimeZone('Asia/Saigon')).toBe(true)
    expect(isValidTimeZone('UTC')).toBe(true)
  })

  it('từ chối chuỗi rỗng và toàn khoảng trắng', () => {
    expect(isValidTimeZone('')).toBe(false)
    expect(isValidTimeZone('   ')).toBe(false)
  })

  it('TC-009: từ chối Asia/Saigon_typo', () => {
    expect(isValidTimeZone('Asia/Saigon_typo')).toBe(false)
  })

  it('từ chối dạng offset dù Intl chấp nhận — SPEC-002 yêu cầu IANA', () => {
    expect(isValidTimeZone('+07:00')).toBe(false)
    expect(isValidTimeZone('-0500')).toBe(false)
  })
})

describe('canonicalTimeZone', () => {
  it('quy về dạng chuẩn của ICU', () => {
    expect(canonicalTimeZone('Asia/Ho_Chi_Minh')).toBe('Asia/Saigon')
    expect(canonicalTimeZone('Asia/Saigon')).toBe('Asia/Saigon')
  })

  it('trả null khi không hợp lệ', () => {
    expect(canonicalTimeZone('Asia/Saigon_typo')).toBeNull()
  })
})

describe('formatTimeZoneLabel', () => {
  it('dựng nhãn tiếng Việt cho múi giờ có tên', () => {
    expect(formatTimeZoneLabel('Asia/Saigon', NOW)).toBe('Việt Nam · GMT+7')
    expect(formatTimeZoneLabel('Asia/Ho_Chi_Minh', NOW)).toBe('Việt Nam · GMT+7')
    expect(formatTimeZoneLabel('Asia/Tokyo', NOW)).toBe('Nhật Bản · GMT+9')
  })

  it('lấy tên thành phố khi Intl chỉ trả viết tắt', () => {
    expect(formatTimeZoneLabel('America/New_York', NOW)).toContain('New York · GMT-')
  })
})
