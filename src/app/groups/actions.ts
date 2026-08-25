'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { createGroup } from '@/features/group/application/create-group'
import { drizzleGroupRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import type { CreateGroupFormState } from '@/features/group/presentation/components/create-group-form'
import { messageFor } from '@/shared/errors'

/**
 * Lắp ráp cho SPEC-002 — không chứa business logic.
 *
 * Đặt ở `app/` chứ không trong `features/group/`: ESLint chặn `group` import
 * `auth` (CROSS_FEATURE_ZONES), mà action phải tự đọc session. Đây đúng là chỗ
 * mà comment trong `eslint.config.mjs` nói tới.
 */
export async function createGroupAction(
  _previousState: CreateGroupFormState,
  formData: FormData,
): Promise<CreateGroupFormState> {
  // Server Action gọi được bằng POST trực tiếp, không chỉ qua UI.
  const user = await getCurrentUser()
  if (user === null) {
    redirect('/')
  }

  const result = await createGroup(
    { groups: drizzleGroupRepository },
    {
      creatorUserId: user.id,
      name: String(formData.get('name') ?? ''),
      timezone: String(formData.get('timezone') ?? ''),
    },
  )

  if (!result.ok) {
    return { nameError: messageFor(result.error) }
  }

  // `/groups` là dynamic nên không dính Full Route Cache, nhưng client Router
  // Cache thì có — dọn trước khi điều hướng.
  revalidatePath('/groups')

  // `redirect` hoạt động bằng cách throw. Phải là câu lệnh cuối, ngoài try/catch.
  redirect(`/groups/${result.value.id}`)
}
