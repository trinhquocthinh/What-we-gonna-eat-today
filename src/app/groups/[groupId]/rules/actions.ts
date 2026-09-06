'use server'

import { refresh, revalidatePath } from 'next/cache'

import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import { setGroupRules } from '@/features/rule/application/set-group-rules'
import type { RawGroupRule } from '@/features/rule/domain/group-rule'
import { drizzleRuleRepository } from '@/features/rule/infrastructure/drizzle-rule-repository'
import type { RuleFormState } from '@/features/rule/presentation/components/group-rules-screen'
import { messageFor } from '@/shared/errors'

import { requireGroupAdminContext } from '../group-access'

/**
 * Guide §3.1: phân tách trường ghép `ruleType:systemTag:minimumCount`.
 * Không validate ở đây — `readGroupRules` là chỗ validate.
 */
function parseRuleField(raw: string): RawGroupRule {
  const parts = raw.split(':')
  if (parts.length !== 3) {
    return { ruleType: 'INVALID', systemTag: 'INVALID', minimumCount: 0 }
  }
  const [ruleType, systemTag, minimumCountStr] = parts
  return {
    ruleType: ruleType!,
    systemTag: systemTag!,
    minimumCount: Number(minimumCountStr),
  }
}

export async function setGroupRulesAction(
  groupId: string,
  _previousState: RuleFormState,
  formData: FormData,
): Promise<RuleFormState> {
  const { user } = await requireGroupAdminContext(groupId)

  // Guide §3.1: đọc trường ghép `rule` thay cho hai/ba mảng song song.
  const rawRuleFields = formData.getAll('rule').map(String)
  const rules: RawGroupRule[] =
    rawRuleFields.length > 0
      ? rawRuleFields.map(parseRuleField)
      : formData
          .getAll('systemTag')
          .map(String)
          .map((systemTag, index) => ({
            systemTag,
            minimumCount: Number(formData.getAll('minimumCount')[index]),
            ruleType: 'REQUIRED',
          }))

  // Guide §5.3: đọc targetDishCount (chuỗi rỗng = null)
  const rawTarget = formData.get('targetDishCount')
  const targetDishCount = rawTarget === null || rawTarget === '' ? null : Number(rawTarget)

  const result = await setGroupRules(
    {
      rules: drizzleRuleRepository,
      assertAdmin: ({ userId, groupId: gid }) =>
        assertGroupAccess(
          { memberships: drizzleMembershipRepository },
          { userId, groupId: gid, requiredRole: 'ADMIN' },
        ),
    },
    {
      groupId,
      rules,
      targetDishCount,
      requestedByUserId: user.id,
    },
  )

  if (!result.ok) {
    return { error: messageFor(result.error), savedAt: null }
  }

  revalidatePath(`/groups/${groupId}/rules`)
  refresh()
  return { error: null, savedAt: Date.now() }
}
