import { describe, expect, it } from 'vitest'

import type { SystemTag } from '@/shared/domain/system-tag'

import { findMatchingCourse, splitIntoCourses } from './course-deck'

describe('course-deck — SPEC-030 / BR-063', () => {
  it('TC-134 — 3 chặng, mỗi chặng dư món: mỗi chặng đúng 10 thẻ', () => {
    const courses: SystemTag[] = ['STAPLE', 'MAIN', 'SOUP']
    const orderedDishIds: string[] = []
    const tagsByDishId = new Map<string, SystemTag[]>()

    // Mỗi chặng 20 món
    for (let i = 0; i < 20; i += 1) {
      const idStaple = `staple-${i}`
      const idMain = `main-${i}`
      const idSoup = `soup-${i}`

      orderedDishIds.push(idStaple, idMain, idSoup)
      tagsByDishId.set(idStaple, ['STAPLE'])
      tagsByDishId.set(idMain, ['MAIN'])
      tagsByDishId.set(idSoup, ['SOUP'])
    }

    const result = splitIntoCourses({
      orderedDishIds,
      tagsByDishId,
      courses,
      maxCards: 30,
    })

    expect(result).toHaveLength(3)
    expect(result[0]?.systemTag).toBe('STAPLE')
    expect(result[0]?.dishIds).toHaveLength(10)
    expect(result[1]?.systemTag).toBe('MAIN')
    expect(result[1]?.dishIds).toHaveLength(10)
    expect(result[2]?.systemTag).toBe('SOUP')
    expect(result[2]?.dishIds).toHaveLength(10)

    const flat = result.flatMap((c) => c.dishIds)
    expect(flat).toHaveLength(30)
    expect(new Set(flat).size).toBe(30)
  })

  it('TC-135 — 3 chặng, SOUP chỉ có 4 món: 13 + 13 + 4 = 30', () => {
    const courses: SystemTag[] = ['STAPLE', 'MAIN', 'SOUP']
    const orderedDishIds: string[] = []
    const tagsByDishId = new Map<string, SystemTag[]>()

    // STAPLE 20 món, MAIN 20 món, SOUP 4 món
    for (let i = 0; i < 20; i += 1) {
      const idStaple = `staple-${i}`
      const idMain = `main-${i}`
      orderedDishIds.push(idStaple, idMain)
      tagsByDishId.set(idStaple, ['STAPLE'])
      tagsByDishId.set(idMain, ['MAIN'])
    }
    for (let i = 0; i < 4; i += 1) {
      const idSoup = `soup-${i}`
      orderedDishIds.push(idSoup)
      tagsByDishId.set(idSoup, ['SOUP'])
    }

    const result = splitIntoCourses({
      orderedDishIds,
      tagsByDishId,
      courses,
      maxCards: 30,
    })

    expect(result).toHaveLength(3)
    expect(result.find((c) => c.systemTag === 'STAPLE')?.dishIds).toHaveLength(13)
    expect(result.find((c) => c.systemTag === 'MAIN')?.dishIds).toHaveLength(13)
    expect(result.find((c) => c.systemTag === 'SOUP')?.dishIds).toHaveLength(4)

    const flat = result.flatMap((c) => c.dishIds)
    expect(flat).toHaveLength(30)
    expect(new Set(flat).size).toBe(30)
  })

  it('TC-136 — Món STAPLE+MAIN, cả hai đều là chặng: chỉ vào ĐÚNG MỘT chặng đầu tiên theo thứ tự Creator', () => {
    // Creator sắp MAIN trước STAPLE
    const courses: SystemTag[] = ['MAIN', 'STAPLE']
    const tagsByDishId = new Map<string, SystemTag[]>([
      ['multi-1', ['STAPLE', 'MAIN']], // Tag chuẩn hoá STAPLE trước MAIN, nhưng Creator sắp MAIN trước
      ['main-1', ['MAIN']],
      ['staple-1', ['STAPLE']],
    ])
    const orderedDishIds = ['multi-1', 'main-1', 'staple-1']

    const result = splitIntoCourses({
      orderedDishIds,
      tagsByDishId,
      courses,
      maxCards: 30,
    })

    const mainCourse = result.find((c) => c.systemTag === 'MAIN')
    const stapleCourse = result.find((c) => c.systemTag === 'STAPLE')

    expect(mainCourse?.dishIds).toContain('multi-1')
    expect(stapleCourse?.dishIds).not.toContain('multi-1')

    const flat = result.flatMap((c) => c.dishIds)
    expect(new Set(flat).size).toBe(flat.length)
  })

  it('TC-152 — THEN CHỐT: 100 món, top-30 không có SOUP nào; chặng Canh có 15 món ở đuôi bảng -> chặng Canh vẫn ĐẦY ĐỦ món', () => {
    const courses: SystemTag[] = ['MAIN', 'SOUP']
    const orderedDishIds: string[] = []
    const tagsByDishId = new Map<string, SystemTag[]>()

    // 85 món MAIN đứng đầu bảng
    for (let i = 0; i < 85; i += 1) {
      const id = `main-${i}`
      orderedDishIds.push(id)
      tagsByDishId.set(id, ['MAIN'])
    }
    // 15 món SOUP đứng cuối bảng (index 85..99)
    for (let i = 0; i < 15; i += 1) {
      const id = `soup-${i}`
      orderedDishIds.push(id)
      tagsByDishId.set(id, ['SOUP'])
    }

    const result = splitIntoCourses({
      orderedDishIds,
      tagsByDishId,
      courses,
      maxCards: 30,
    })

    const mainCourse = result.find((c) => c.systemTag === 'MAIN')
    const soupCourse = result.find((c) => c.systemTag === 'SOUP')

    expect(mainCourse?.dishIds).toHaveLength(15)
    expect(soupCourse?.dishIds).toHaveLength(15)
    // Chặng SOUP lấy đúng 15 món canh từ đuôi bảng
    expect(soupCourse?.dishIds).toEqual(Array.from({ length: 15 }, (_, i) => `soup-${i}`))
  })

  it('Phân bổ lại lặp đúng khi nhiều chặng cùng chạm trần', () => {
    // 4 chặng: STAPLE (2 món), SIDE (3 món), MAIN (50 món), SOUP (50 món)
    // maxCards = 30 -> base = 7/7/8/8
    // STAPLE cần 2 (dư 5), SIDE cần 3 (dư 4) -> tổng dư 9
    // MAIN và SOUP chia 9 -> mỗi bên +4, MAIN (đứng trước) +1 -> 12 + 4 + 1 = 17 cho MAIN, 12 + 4 = 16 cho SOUP (hoặc tương ứng)
    const courses: SystemTag[] = ['STAPLE', 'SIDE', 'MAIN', 'SOUP']
    const orderedDishIds: string[] = []
    const tagsByDishId = new Map<string, SystemTag[]>()

    orderedDishIds.push('staple-0', 'staple-1')
    tagsByDishId.set('staple-0', ['STAPLE'])
    tagsByDishId.set('staple-1', ['STAPLE'])

    orderedDishIds.push('side-0', 'side-1', 'side-2')
    tagsByDishId.set('side-0', ['SIDE'])
    tagsByDishId.set('side-1', ['SIDE'])
    tagsByDishId.set('side-2', ['SIDE'])

    for (let i = 0; i < 50; i += 1) {
      const idMain = `main-${i}`
      const idSoup = `soup-${i}`
      orderedDishIds.push(idMain, idSoup)
      tagsByDishId.set(idMain, ['MAIN'])
      tagsByDishId.set(idSoup, ['SOUP'])
    }

    const result = splitIntoCourses({
      orderedDishIds,
      tagsByDishId,
      courses,
      maxCards: 30,
    })

    const staple = result.find((c) => c.systemTag === 'STAPLE')?.dishIds ?? []
    const side = result.find((c) => c.systemTag === 'SIDE')?.dishIds ?? []
    const main = result.find((c) => c.systemTag === 'MAIN')?.dishIds ?? []
    const soup = result.find((c) => c.systemTag === 'SOUP')?.dishIds ?? []

    expect(staple).toHaveLength(2)
    expect(side).toHaveLength(3)
    expect(staple.length + side.length + main.length + soup.length).toBe(30)

    const flat = result.flatMap((c) => c.dishIds)
    expect(new Set(flat).size).toBe(30)
  })

  it('Món không khớp chặng nào (hoặc không gắn tag) bị loại khỏi deck', () => {
    const courses: SystemTag[] = ['MAIN', 'SOUP']
    const orderedDishIds = ['main-1', 'dessert-1', 'no-tag', 'soup-1']
    const tagsByDishId = new Map<string, SystemTag[]>([
      ['main-1', ['MAIN']],
      ['dessert-1', ['DESSERT']],
      ['no-tag', []],
      ['soup-1', ['SOUP']],
    ])

    const result = splitIntoCourses({
      orderedDishIds,
      tagsByDishId,
      courses,
      maxCards: 30,
    })

    const flat = result.flatMap((c) => c.dishIds)
    expect(flat).toEqual(['main-1', 'soup-1'])
    expect(flat).not.toContain('dessert-1')
    expect(flat).not.toContain('no-tag')
  })

  it('findMatchingCourse trả về đúng chặng đầu tiên khớp theo thứ tự courses', () => {
    expect(findMatchingCourse(['STAPLE', 'MAIN'], ['SOUP', 'MAIN', 'STAPLE'])).toBe('MAIN')
    expect(findMatchingCourse(['STAPLE', 'MAIN'], ['STAPLE', 'MAIN'])).toBe('STAPLE')
    expect(findMatchingCourse(['DESSERT'], ['MAIN', 'SOUP'])).toBeNull()
    expect(findMatchingCourse([], ['MAIN', 'SOUP'])).toBeNull()
  })
})
