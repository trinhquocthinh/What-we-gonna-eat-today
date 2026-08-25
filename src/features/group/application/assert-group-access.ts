import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { isActiveMembership } from '../domain/membership'
import type { MembershipRepository } from './membership-repository'

/** SPEC-019. Hai mức duy nhất trong Group — không có RBAC nhiều tầng. */
type GroupRole = 'MEMBER' | 'ADMIN'

export type AssertGroupAccessDeps = {
  readonly memberships: MembershipRepository
}

export type AssertGroupAccessInput = {
  readonly userId: string
  readonly groupId: string
  readonly requiredRole: GroupRole
}

/**
 * SPEC-019 — Authorization guard.
 *
 * Tech Spec §5: mọi Server Action và Route Handler gọi hàm này TRƯỚC business
 * logic. Không dựa vào việc ẩn nút trên UI — Server Action gọi được bằng POST
 * trực tiếp.
 *
 * Kiểm tra Creator của Session KHÔNG nằm ở đây: Creator là thuộc tính của
 * Session chứ không phải của Group (SPEC-019, Tech Spec §5).
 */
export async function assertGroupAccess(
  deps: AssertGroupAccessDeps,
  input: AssertGroupAccessInput,
): Promise<Result<void, Failure>> {
  const membership = await deps.memberships.findMembership(input.groupId, input.userId)

  if (membership === null || !isActiveMembership(membership)) {
    return err(failure('ERR_NOT_GROUP_MEMBER', { groupId: input.groupId }))
  }

  if (input.requiredRole === 'ADMIN' && !membership.isAdmin) {
    return err(failure('ERR_NOT_GROUP_ADMIN', { groupId: input.groupId }))
  }

  return ok(undefined)
}
