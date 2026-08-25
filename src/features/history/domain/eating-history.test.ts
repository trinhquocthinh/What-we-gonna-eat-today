import { describe, expect, it } from 'vitest'
import { groupEatingHistory, type EatingRecord } from './eating-history'

describe('groupEatingHistory', () => {
  it('gom bản ghi phẳng theo ngày, ngày mới nhất đứng đầu', () => {
    const records: EatingRecord[] = [
      { eatingDate: '2026-08-10', dishName: 'Món A' },
      { eatingDate: '2026-08-12', dishName: 'Món B' },
      { eatingDate: '2026-08-10', dishName: 'Món C' },
    ]

    const days = groupEatingHistory(records)
    expect(days).toEqual([
      { eatingDate: '2026-08-12', dishNames: ['Món B'] },
      { eatingDate: '2026-08-10', dishNames: ['Món A', 'Món C'] },
    ])
  })

  it('BR-046 Multi-source Collapse: cùng ngày cùng tên món 2 bản ghi chỉ còn 1 tên', () => {
    const records: EatingRecord[] = [
      { eatingDate: '2026-08-10', dishName: 'Cá basa kho tiêu' },
      { eatingDate: '2026-08-10', dishName: 'Cá basa kho tiêu' },
    ]

    const days = groupEatingHistory(records)
    expect(days).toEqual([{ eatingDate: '2026-08-10', dishNames: ['Cá basa kho tiêu'] }])
  })

  it('mảng rỗng trả về mảng rỗng', () => {
    expect(groupEatingHistory([])).toEqual([])
  })

  it('tên món trong cùng một ngày được sắp theo localeCompare tiếng Việt', () => {
    const records: EatingRecord[] = [
      { eatingDate: '2026-08-10', dishName: 'Bò xào' },
      { eatingDate: '2026-08-10', dishName: 'Ăn vặt' },
      { eatingDate: '2026-08-10', dishName: 'Cá kho' },
    ]

    const days = groupEatingHistory(records)
    expect(days).toHaveLength(1)
    expect(days[0]?.dishNames).toEqual(['Ăn vặt', 'Bò xào', 'Cá kho'])
  })
})
