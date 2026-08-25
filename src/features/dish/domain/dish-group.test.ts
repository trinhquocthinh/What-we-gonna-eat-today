import { describe, expect, it } from 'vitest'

import { groupDishesByTag } from './dish-group'

describe('groupDishesByTag', () => {
  it('nhóm theo đúng thứ tự mâm cơm, không theo thứ tự dữ liệu', () => {
    const dishes = [
      { id: '1', name: 'Chè', systemTags: ['DESSERT'] as const },
      { id: '2', name: 'Cơm trắng', systemTags: ['STAPLE'] as const },
      { id: '3', name: 'Canh chua', systemTags: ['SOUP'] as const },
    ]

    expect(groupDishesByTag(dishes).map((g) => g.tag)).toEqual(['STAPLE', 'SOUP', 'DESSERT'])
  })

  it('nhóm rỗng bị loại', () => {
    const dishes = [{ id: '1', name: 'Canh chua', systemTags: ['SOUP'] as const }]
    expect(groupDishesByTag(dishes)).toHaveLength(1)
  })

  it('món nhiều nhãn xuất hiện ở nhiều nhóm (SDD §8)', () => {
    const dishes = [{ id: '1', name: 'Bò kho bánh mì', systemTags: ['MAIN', 'SOUP'] as const }]
    const groups = groupDishesByTag(dishes)

    expect(groups.map((g) => g.tag)).toEqual(['MAIN', 'SOUP'])
    expect(groups[0]?.dishes[0]?.id).toBe('1')
    expect(groups[1]?.dishes[0]?.id).toBe('1')
  })

  it('món chưa có nhãn dồn về nhóm cuối', () => {
    const dishes = [
      { id: '1', name: 'Canh chua', systemTags: ['SOUP'] as const },
      { id: '2', name: 'Món lạ', systemTags: [] as const },
    ]
    const groups = groupDishesByTag(dishes)

    expect(groups.at(-1)?.tag).toBeNull()
    expect(groups.at(-1)?.dishes[0]?.id).toBe('2')
  })
})
