import { and, eq } from 'drizzle-orm'

import type { Database } from '@/shared/db/client'
import { getDb } from '@/shared/db/client'
import { groups, groupRules, selectionSessions, sessionRules } from '@/shared/db/schema'
import { SYSTEM_TAGS, type SystemTag } from '@/shared/domain/system-tag'

import type { GroupRuleRecord, RuleRepository } from '../application/rule-repository'
import type { SessionRule } from '../domain/evaluate'

const TAG_ORDER = new Map<SystemTag, number>(SYSTEM_TAGS.map((tag, index) => [tag, index]))

async function listGroupRules(groupId: string): Promise<GroupRuleRecord[]> {
  const rows = await getDb()
    .select({
      id: groupRules.id,
      systemTag: groupRules.systemTag,
      minimumCount: groupRules.minimumCount,
      ruleType: groupRules.ruleType,
    })
    .from(groupRules)
    .where(eq(groupRules.groupId, groupId))

  // Sắp ở TS chứ không ORDER BY: REQUIRED trước PREFERRED, sau đó theo thứ tự mâm cơm `SYSTEM_TAGS`.
  return rows.sort((a, b) => {
    if (a.ruleType !== b.ruleType) {
      return a.ruleType === 'REQUIRED' ? -1 : 1
    }
    return (TAG_ORDER.get(a.systemTag) ?? 0) - (TAG_ORDER.get(b.systemTag) ?? 0)
  })
}

/**
 * GHI ĐÈ TOÀN BỘ trong MỘT `db.batch()` — batch của neon-http LÀ transaction
 * Postgres thật (đã verify ở E4-S2, xem guide E4-S2 §1.1).
 *
 * Ghi kèm `groups.target_dish_count` nếu được truyền vào (E10-T3).
 */
async function replaceGroupRules(
  groupId: string,
  rules: readonly {
    readonly systemTag: SystemTag
    readonly minimumCount: number
    readonly ruleType?: 'REQUIRED' | 'PREFERRED'
  }[],
  targetDishCount?: number | null,
): Promise<void> {
  const db = getDb()
  const remove = db.delete(groupRules).where(eq(groupRules.groupId, groupId))

  type BatchItem = Parameters<typeof db.batch>[0][number]
  const statements: BatchItem[] = [remove]

  if (targetDishCount !== undefined) {
    statements.push(db.update(groups).set({ targetDishCount }).where(eq(groups.id, groupId)))
  }

  if (rules.length > 0) {
    statements.push(
      db.insert(groupRules).values(
        rules.map((rule) => ({
          groupId,
          systemTag: rule.systemTag,
          minimumCount: rule.minimumCount,
          ruleType: rule.ruleType ?? 'REQUIRED',
        })),
      ),
    )
  }

  if (statements.length === 1) {
    await statements[0]
  } else {
    await db.batch(statements as unknown as readonly [BatchItem, ...BatchItem[]])
  }
}

/**
 * SPEC-022 — DỰNG câu lệnh snapshot, KHÔNG chạy nó.
 *
 * Trả về một `BatchItem<'pg'>` để `session/infrastructure` bỏ vào `db.batch()`
 * của `startDraft`. Thứ đi qua ranh giới feature là VIỆC CẦN LÀM, không phải
 * dữ liệu và cũng không phải một query đã chạy: feature `rule` giữ toàn quyền
 * sở hữu SQL của bảng mình, feature `session` giữ toàn quyền quyết định giao
 * dịch của mình (DEC-043).
 *
 * `WHERE state = 'DRAFT'` là toàn bộ cơ chế idempotency và cách ly — câu này
 * PHẢI đứng TRƯỚC câu UPDATE trong batch. Đổi thứ tự hai câu sẽ làm TC-090 và
 * TC-093 hỏng mà không test nào ở tầng D bắt được.
 *
 * `INSERT … SELECT` chứ không đọc-về-rồi-ghi: giữ câu lệnh tự chứa là điều kiện
 * để `db.batch()` (driver HTTP) đủ dùng, không phải thêm driver WebSocket —
 * xem ghi chú ở `shared/db/client.ts`.
 *
 * E10 §1.1: Snapshot Preferred là MIỄN PHÍ vì câu select không lọc ruleType.
 */
export function buildSnapshotStatement(db: Database, sessionId: string) {
  return db
    .insert(sessionRules)
    .select(
      db
        .select({
          sessionId: selectionSessions.id,
          ruleType: groupRules.ruleType,
          systemTag: groupRules.systemTag,
          minimumCount: groupRules.minimumCount,
        })
        .from(selectionSessions)
        .innerJoin(groupRules, eq(groupRules.groupId, selectionSessions.groupId))
        .where(and(eq(selectionSessions.id, sessionId), eq(selectionSessions.state, 'DRAFT'))),
    )
    .onConflictDoNothing()
}

/**
 * SPEC-022 + E10-T1 phía đọc: trả CẢ HAI loại (REQUIRED lẫn PREFERRED).
 * Sắp xếp REQUIRED trước, sau đó theo TAG_ORDER.
 */
async function listSessionRules(sessionId: string): Promise<SessionRule[]> {
  const rows = await getDb()
    .select({
      systemTag: sessionRules.systemTag,
      minimumCount: sessionRules.minimumCount,
      ruleType: sessionRules.ruleType,
    })
    .from(sessionRules)
    .where(eq(sessionRules.sessionId, sessionId))

  return rows.sort((a, b) => {
    if (a.ruleType !== b.ruleType) {
      return a.ruleType === 'REQUIRED' ? -1 : 1
    }
    return (TAG_ORDER.get(a.systemTag) ?? 0) - (TAG_ORDER.get(b.systemTag) ?? 0)
  })
}

export const drizzleRuleRepository: RuleRepository = {
  listGroupRules,
  replaceGroupRules,
  listSessionRules,
}
