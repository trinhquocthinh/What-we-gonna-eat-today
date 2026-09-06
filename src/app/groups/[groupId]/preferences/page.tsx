import { drizzlePreferenceRepository } from '@/features/preference/infrastructure/drizzle-preference-repository'
import { PreferenceSettingsScreen } from '@/features/preference/presentation/components/preference-settings-screen'

import { requireGroupContext } from '../group-access'

// Khai kiểu THỦ CÔNG, KHÔNG dùng helper `PageProps` (bẫy đã ghi ở E2-S4).
type PreferencesPageProps = { params: Promise<{ groupId: string }> }

/**
 * S-13 — cài đặt cá nhân. `SPEC-040` (`F39`).
 *
 * Nằm dưới `/groups/[groupId]/` dù dữ liệu là của USER chứ không của Group:
 * mọi trang hiện có đều trong group scope, `requireGroupContext` là guard sẵn
 * có, và ở giai đoạn này một người thuộc đúng một Group (`DEC-004`). Khi `F43`
 * multi-group vào, trang này chuyển lên top-level.
 */
export default async function PreferencesPage({ params }: PreferencesPageProps) {
  const { groupId } = await params
  const { user, group } = await requireGroupContext(groupId)

  const implicitResetAt = await drizzlePreferenceRepository.findImplicitResetAt(user.id)

  return (
    <PreferenceSettingsScreen groupName={group.name} initialImplicitResetAt={implicitResetAt} />
  )
}
