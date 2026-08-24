import type { SystemTag } from '@/shared/domain/system-tag'

export type GroupRuleRecord = {
  readonly id: string
  readonly systemTag: SystemTag
  readonly minimumCount: number
}

export interface RuleRepository {
  /** SPEC-021. Theo thứ tự mâm cơm (`SYSTEM_TAGS`), không theo thứ tự chèn. */
  listGroupRules(groupId: string): Promise<GroupRuleRecord[]>

  /**
   * SPEC-021 — GHI ĐÈ TOÀN BỘ, không cộng dồn (TC-088: mảng rỗng xoá sạch).
   * DELETE + INSERT trong MỘT `db.batch()`: không có ai đọc giữa hai bước, và
   * một request hỏng giữa chừng không được để Group ở trạng thái "đã xoá rule
   * cũ, chưa có rule mới".
   */
  replaceGroupRules(
    groupId: string,
    rules: readonly { systemTag: SystemTag; minimumCount: number }[],
  ): Promise<void>
}
