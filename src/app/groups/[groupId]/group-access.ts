import { notFound, redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import type { AuthenticatedUser } from '@/features/auth/domain/provider-identity'
import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import type { GroupSummary } from '@/features/group/application/group-repository'
import {
  drizzleGroupRepository,
  drizzleMembershipRepository,
} from '@/features/group/infrastructure/drizzle-group-repository'

export type GroupContext = {
  readonly user: AuthenticatedUser
  readonly group: GroupSummary
}

/**
 * Lắp ráp dùng chung cho MỌI thứ dưới `/groups/[groupId]` — page, page con, và
 * Server Action. Tech Spec §5: guard chạy TRƯỚC business logic, ở mọi cửa vào.
 *
 * Đặt ở `app/` là bắt buộc, không phải tiện: `CROSS_FEATURE_ZONES` chặn
 * `features/dish/**` import cả `auth` lẫn `group`. Đây đúng chỗ mà comment
 * trong `eslint.config.mjs` nói tới.
 *
 * Ba nơi gọi hàm này là ba nơi có thể quên guard nếu chép tay — và cũng là chỗ
 * jscpd sẽ đỏ.
 *
 * `notFound()` chứ không `forbidden()`: (a) `forbidden()` cần
 * `experimental.authInterrupts`; (b) NFR-04 — không lộ nhóm có tồn tại hay
 * không. `notFound()` gọi được cả trong Server Action (docs
 * `04-functions/not-found.md`).
 *
 * Cả `redirect` lẫn `notFound` đều hoạt động bằng cách throw, nên kiểu trả về
 * `Promise<GroupContext>` là thật — người gọi không phải kiểm null.
 */
export async function requireGroupContext(groupId: string): Promise<GroupContext> {
  const user = await getCurrentUser()
  if (user === null) {
    redirect('/')
  }

  const access = await assertGroupAccess(
    { memberships: drizzleMembershipRepository },
    { userId: user.id, groupId, requiredRole: 'MEMBER' },
  )
  if (!access.ok) {
    notFound()
  }

  const group = await drizzleGroupRepository.findById(groupId)
  if (group === null) {
    notFound()
  }

  return { user, group }
}
