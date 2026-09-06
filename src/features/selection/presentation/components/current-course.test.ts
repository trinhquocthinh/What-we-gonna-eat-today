import { describe, expect, it } from 'vitest'

import { currentCourse, type CourseBoundary } from './current-course'

describe('currentCourse (E9-T5)', () => {
  const THREE_COURSES: readonly CourseBoundary[] = [
    { systemTag: 'STAPLE', count: 2 },
    { systemTag: 'MAIN', count: 3 },
    { systemTag: 'SOUP', count: 2 },
  ]

  it('courses === null hoặc rỗng trả null (chế độ FREE)', () => {
    expect(currentCourse(null, 0)).toBeNull()
    expect(currentCourse([], 0)).toBeNull()
  })

  it('cursor âm trả null', () => {
    expect(currentCourse(THREE_COURSES, -1)).toBeNull()
  })

  it('cursor trong chặng đầu: index=1, position và count đúng', () => {
    expect(currentCourse(THREE_COURSES, 0)).toEqual({
      index: 1,
      total: 3,
      systemTag: 'STAPLE',
      position: 1,
      count: 2,
    })

    expect(currentCourse(THREE_COURSES, 1)).toEqual({
      index: 1,
      total: 3,
      systemTag: 'STAPLE',
      position: 2,
      count: 2,
    })
  })

  it('cursor trong chặng thứ hai: index=2, position và count tương ứng', () => {
    expect(currentCourse(THREE_COURSES, 2)).toEqual({
      index: 2,
      total: 3,
      systemTag: 'MAIN',
      position: 1,
      count: 3,
    })

    expect(currentCourse(THREE_COURSES, 4)).toEqual({
      index: 2,
      total: 3,
      systemTag: 'MAIN',
      position: 3,
      count: 3,
    })
  })

  it('cursor trong chặng cuối: index=3, position và count tương ứng', () => {
    expect(currentCourse(THREE_COURSES, 5)).toEqual({
      index: 3,
      total: 3,
      systemTag: 'SOUP',
      position: 1,
      count: 2,
    })

    expect(currentCourse(THREE_COURSES, 6)).toEqual({
      index: 3,
      total: 3,
      systemTag: 'SOUP',
      position: 2,
      count: 2,
    })
  })

  it('cursor vượt quá tổng số thẻ: trả null (màn hết thẻ)', () => {
    expect(currentCourse(THREE_COURSES, 7)).toBeNull()
    expect(currentCourse(THREE_COURSES, 100)).toBeNull()
  })

  it('chặng có count = 0 bị bỏ qua', () => {
    const withEmpty: readonly CourseBoundary[] = [
      { systemTag: 'STAPLE', count: 0 },
      { systemTag: 'MAIN', count: 2 },
    ]
    expect(currentCourse(withEmpty, 0)).toEqual({
      index: 2,
      total: 2,
      systemTag: 'MAIN',
      position: 1,
      count: 2,
    })
  })
})
