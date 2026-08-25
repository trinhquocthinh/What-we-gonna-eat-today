import { describe, expect, it } from 'vitest'

import {
  computeDragRotationDeg,
  computeFlyOutTranslateX,
  resolvePreviewDirection,
  shouldCommitOnRelease,
} from './swipe-gesture'

describe('resolvePreviewDirection', () => {
  it('dx trong khoảng [-40, 40] thì chưa có hướng', () => {
    expect(resolvePreviewDirection(0)).toBe(0)
    expect(resolvePreviewDirection(39)).toBe(0)
    expect(resolvePreviewDirection(-39)).toBe(0)
  })

  it('dx > 40 thì hướng phải (Đề xuất)', () => {
    expect(resolvePreviewDirection(41)).toBe(1)
  })

  it('dx < -40 thì hướng trái (Không hôm nay)', () => {
    expect(resolvePreviewDirection(-41)).toBe(-1)
  })
})

describe('shouldCommitOnRelease', () => {
  it('|dx| <= 90 thì KHÔNG commit — bounce về giữa', () => {
    expect(shouldCommitOnRelease(90)).toBe(0)
    expect(shouldCommitOnRelease(-90)).toBe(0)
  })

  it('dx > 90 thì commit phải', () => {
    expect(shouldCommitOnRelease(91)).toBe(1)
  })

  it('dx < -90 thì commit trái', () => {
    expect(shouldCommitOnRelease(-91)).toBe(-1)
  })
})

describe('computeDragRotationDeg', () => {
  it('góc xoay tỉ lệ thuận dx/18', () => {
    expect(computeDragRotationDeg(18)).toBe(1)
    expect(computeDragRotationDeg(-18)).toBe(-1)
  })

  it('kẹp trong [-8, 8] độ dù dx rất lớn', () => {
    expect(computeDragRotationDeg(1000)).toBe(8)
    expect(computeDragRotationDeg(-1000)).toBe(-8)
  })
})

describe('computeFlyOutTranslateX', () => {
  it('bay ra đúng hướng, cách 460px', () => {
    expect(computeFlyOutTranslateX(1)).toBe(460)
    expect(computeFlyOutTranslateX(-1)).toBe(-460)
  })
})
