import { and, eq } from 'drizzle-orm'

import { getDb } from '@/shared/db/client'
import { users } from '@/shared/db/schema'

import type { UserRepository } from '../application/user-repository'
import type {
  AuthenticatedUser,
  ProviderIdentity,
  ProviderProfile,
} from '../domain/provider-identity'

/** Chỉ ba cột này rời khỏi infrastructure — SDD §2.3 cấm rò rỉ row ORM ra ngoài. */
const RETURNED_COLUMNS = {
  id: users.id,
  displayName: users.displayName,
  email: users.email,
}

async function findByProviderIdentity(
  identity: ProviderIdentity,
): Promise<AuthenticatedUser | null> {
  const rows = await getDb()
    .select(RETURNED_COLUMNS)
    .from(users)
    .where(
      and(
        eq(users.provider, identity.provider),
        eq(users.providerSubject, identity.providerSubject),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

/**
 * `onConflictDoNothing` trên unique index `(provider, provider_subject)`: hai
 * request đầu tiên của cùng một người chạy song song thì một cái insert được,
 * cái kia nhận mảng rỗng rồi đọc lại — không có bên nào thấy unique violation.
 *
 * `id` do `$defaultFn(() => uuidv7())` trong schema sinh, không truyền vào đây.
 */
async function createFromProvider(profile: ProviderProfile): Promise<AuthenticatedUser> {
  const inserted = await getDb()
    .insert(users)
    .values({
      provider: profile.provider,
      providerSubject: profile.providerSubject,
      email: profile.email,
      displayName: profile.displayName,
    })
    .onConflictDoNothing({ target: [users.provider, users.providerSubject] })
    .returning(RETURNED_COLUMNS)

  const created = inserted[0]
  if (created !== undefined) {
    return created
  }

  const existing = await findByProviderIdentity(profile)
  if (existing === null) {
    throw new Error('SPEC-001: insert bị bỏ qua nhưng không tìm thấy User tương ứng')
  }
  return existing
}

export const drizzleUserRepository: UserRepository = {
  findByProviderIdentity,
  createFromProvider,
}
