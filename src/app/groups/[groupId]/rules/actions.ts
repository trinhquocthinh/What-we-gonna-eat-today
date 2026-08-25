'use server'

import { refresh, revalidatePath } from 'next/cache'

import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import { setGroupRules } from '@/features/rule/application/set-group-rules'
import { drizzleRuleRepository } from '@/features/rule/infrastructure/drizzle-rule-repository'
import type { RuleFormState } from '@/features/rule/presentation/components/group-rules-screen'
import { messageFor } from '@/shared/errors'

import { requireGroupAdminContext } from '../group-access'

export async function setGroupRulesAction(
  groupId: string,
  _previousState: RuleFormState,
  formData: FormData,
): Promise<RuleFormState> {
  const { user } = await requireGroupAdminContext(groupId)

  // `getAll` chứ không `get`: form gửi lên N cặp (systemTag, minimumCount) —
  // hai mảng song song, ghép theo chỉ số. Cùng khuôn `setSystemTagsAction`.
  const tags = formData.getAll('systemTag').map(String)
  const counts = formData.getAll('minimumCount').map((value) => Number(value))

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
      rules: tags.map((systemTag, index) => ({
        systemTag,
        minimumCount: counts[index] ?? 0,
      })),
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
