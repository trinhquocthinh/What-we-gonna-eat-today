'use client'

import { useEffect, useRef, useState } from 'react'

import { readDishSearchQuery } from '../../domain/dish-search-query'
import { searchGlobalDishes, type CatalogSuggestion } from './search-global-dishes'

/** 250ms — nằm giữa dải 200–300ms quen thuộc của typeahead, đủ để một từ tiếng
 *  Việt 3–5 ký tự gom về một hai request thay vì mỗi phím một lần. */
const DEBOUNCE_MS = 250

/**
 * Gợi ý từ catalog chung theo tên đang gõ.
 *
 * Ba thứ phải có, thiếu cái nào cũng thành lỗi khó lần:
 * 1. **Debounce** — không bắn mỗi phím một request.
 * 2. **Huỷ request cũ** (`AbortController`) — tránh chất đống kết nối.
 * 3. **Chốt chặn kết quả cũ** — huỷ KHÔNG đảm bảo thứ tự, nên vẫn phải so lại
 *    truy vấn lúc kết quả về với truy vấn hiện tại trước khi `setState`. Thiếu
 *    bước này thì một phản hồi chậm của "bun" có thể đè lên kết quả của
 *    "bun cha".
 *
 * "Chưa đủ ký tự" được SUY RA lúc render chứ không ghi vào state: ghi state
 * thẳng trong thân effect gây cascading render (`react-hooks/set-state-in-effect`
 * bắt đúng chỗ này). Ở đây `setState` chỉ chạy trong callback bất đồng bộ.
 *
 * KHÔNG xoá gợi ý đang hiện trong lúc chờ kết quả mới: Neon free tier có thể
 * ngủ, và một danh sách chớp tắt liên tục khó chịu hơn hẳn một danh sách hơi cũ.
 */
export function useCatalogSuggestions(groupId: string, name: string): CatalogSuggestion[] {
  const [suggestions, setSuggestions] = useState<CatalogSuggestion[]>([])
  const latestQuery = useRef<string | null>(null)

  const query = readDishSearchQuery(name)

  useEffect(() => {
    const current = readDishSearchQuery(name)
    latestQuery.current = current

    if (current === null) return

    const controller = new AbortController()
    const timer = setTimeout(() => {
      void searchGlobalDishes(groupId, current, controller.signal).then((result) => {
        if (latestQuery.current === current) {
          setSuggestions(result)
        }
      })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [groupId, name])

  // Gõ lùi xuống dưới ngưỡng thì ẩn ngay, không đợi request nào.
  return query === null ? [] : suggestions
}
