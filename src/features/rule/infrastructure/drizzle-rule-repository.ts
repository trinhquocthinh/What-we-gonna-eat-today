import { eq } from 'drizzle-orm'

import { getDb } from '@/shared/db/client'
import { groupRules } from '@/shared/db/schema'
import { SYSTEM_TAGS, type SystemTag } from '@/shared/domain/system-tag'

import type { GroupRuleRecord, RuleRepository } from '../application/rule-repository'

const TAG_ORDER = new Map<SystemTag, number>(SYSTEM_TAGS.map((tag, index) => [tag, index]))

async function listGroupRules(groupId: string): Promise<GroupRuleRecord[]> {
  const rows = await getDb()
    .select({
      id: groupRules.id,
      systemTag: groupRules.systemTag,
      minimumCount: groupRules.minimumCount,
    })
    .from(groupRules)
    .where(eq(groupRules.groupId, groupId))

  // Sắp ở TS chứ không ORDER BY: thứ tự mâm cơm là thứ tự của `SYSTEM_TAGS`,
  // không phải thứ tự bảng chữ cái mà Postgres sẽ dùng cho kiểu enum nếu ai đó
  // thêm giá trị mới không đúng chỗ. Một Group có tối đa 5 rule Required.
  return rows.sort((a, b) => (TAG_ORDER.get(a.systemTag) ?? 0) - (TAG_ORDER.get(b.systemTag) ?? 0))
}

/**
 * GHI ĐÈ TOÀN BỘ trong MỘT `db.batch()` — batch của neon-http LÀ transaction
 * Postgres thật (đã verify ở E4-S2, xem guide E4-S2 §1.1). Khác `saveDraft`
 * của `meal` (DELETE rồi INSERT ở hai round-trip): ở đó bước sau cần
 * `finalMealId` của bước trước; ở đây không, nên gộp được, và gộp là đúng —
 * DELETE thành công rồi INSERT hỏng sẽ để Group mất sạch quy định.
 *
 * `ruleType: 'REQUIRED'` đóng đinh tại đây: đây là chỗ duy nhất tầng domain
 * (chỉ biết `systemTag` + `minimumCount`) gặp schema đủ 6 cột — Guide §1.2.
 */
async function replaceGroupRules(
  groupId: string,
  rules: readonly { systemTag: SystemTag; minimumCount: number }[],
): Promise<void> {
  const db = getDb()
  const remove = db.delete(groupRules).where(eq(groupRules.groupId, groupId))

  if (rules.length === 0) {
    // TC-088. `db.batch` cần tuple ≥ 1 phần tử, và ở đây chỉ có một câu.
    await remove
    return
  }

  await db.batch([
    remove,
    db.insert(groupRules).values(
      rules.map((rule) => ({
        groupId,
        systemTag: rule.systemTag,
        minimumCount: rule.minimumCount,
        ruleType: 'REQUIRED' as const,
      })),
    ),
  ])
}

export const drizzleRuleRepository: RuleRepository = {
  listGroupRules,
  replaceGroupRules,
}
