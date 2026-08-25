'use client'

import type { ReactElement } from 'react'

import { Button } from '@/shared/ui/button'

import type { CatalogSuggestion } from './search-global-dishes'

export type CatalogSuggestionsProps = {
  suggestions: readonly CatalogSuggestion[]
  /** Chưa tick nhãn nào thì hạ tông nút — cùng quy ước với CTA chính của sheet. */
  hasTags: boolean
}

/**
 * "Có sẵn trong kho món chung" — gợi ý từ `global_dishes` khi đang gõ (SPEC-023).
 *
 * KHÁC HẲN `DuplicateSheet` về ý định, nên trình bày cũng khác: đây là KHÁM PHÁ
 * ("món này có sẵn, lấy đi"), còn kia là CẢNH BÁO ("nhà bạn có thể đã có rồi").
 * Vì vậy không có thẻ nổi từng dòng và không có lối thoát "vẫn tạo mới" — với
 * khám phá thì câu đó vô nghĩa.
 *
 * Nút là `type="submit"` mang `name="reuseGlobalDishId"`: ĐÚNG cơ chế đã chạy
 * của `duplicate-sheet.tsx`, nên `addDishAction` không cần thêm nhánh nào, và
 * các checkbox nhãn đang tick đi cùng trong `FormData` của chính form đó.
 *
 * Vì sao KHÔNG chỉ điền tên rồi để luồng lưu bình thường xử lý:
 * `global_dishes.normalized_name` KHÔNG unique (chủ ý, `schema.ts` — để
 * `forceCreate` tạo được món trùng tên). Tra lại theo tên có thể ra một dòng
 * KHÁC dòng người dùng vừa bấm. Mang thẳng `id` đi là cách duy nhất chắc chắn
 * đúng món.
 */
export function CatalogSuggestions({
  suggestions,
  hasTags,
}: CatalogSuggestionsProps): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <span className="pl-1 text-caption font-medium text-ink-muted">
        Có sẵn trong kho món chung
      </span>

      <ul className="flex flex-col gap-1.5">
        {suggestions.map((suggestion) => (
          <li key={suggestion.id} className="flex items-center justify-between gap-3">
            <span className="text-body font-medium text-ink">{suggestion.name}</span>

            <Button
              type="submit"
              name="reuseGlobalDishId"
              value={suggestion.id}
              variant="quietAccent"
              size="sm"
              className="flex-none"
              muted={!hasTags}
            >
              Dùng món này
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
