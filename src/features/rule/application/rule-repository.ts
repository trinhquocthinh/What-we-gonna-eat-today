import type { SystemTag } from '@/shared/domain/system-tag'

import type { SessionRule } from '../domain/evaluate'

export type GroupRuleRecord = {
  readonly id: string
  readonly systemTag: SystemTag
  readonly minimumCount: number
  readonly ruleType: 'REQUIRED' | 'PREFERRED'
}

export interface RuleRepository {
  /** SPEC-021. Theo thứ tự mâm cơm (`SYSTEM_TAGS`), không theo thứ tự chèn. */
  listGroupRules(groupId: string): Promise<GroupRuleRecord[]>

  /**
   * SPEC-021 + E10-T1/T3 — GHI ĐÈ TOÀN BỘ, không cộng dồn (TC-088: mảng rỗng xoá sạch).
   * DELETE + INSERT trong MỘT `db.batch()` cùng với cập nhật `groups.target_dish_count`.
   */
  replaceGroupRules(
    groupId: string,
    rules: readonly {
      readonly systemTag: SystemTag
      readonly minimumCount: number
      readonly ruleType?: 'REQUIRED' | 'PREFERRED'
    }[],
    targetDishCount?: number | null,
  ): Promise<void>

  /**
   * SPEC-022 + E10-T1 phía đọc. Trả cả `REQUIRED` lẫn `PREFERRED`, `REQUIRED` đứng trước.
   */
  listSessionRules(sessionId: string): Promise<SessionRule[]>
}
