import { StartSessionScreen } from '@/features/session/presentation/components/start-session-screen'
import { resolveDecisionDate } from '@/features/session/domain/decision-date'
import { formatVietnameseDate } from '@/shared/time/format-vietnamese-date'

import { requireGroupContext } from '../../group-access'
import { openSessionAction } from './actions'

type NewSessionPageProps = {
  params: Promise<{ groupId: string }>
}

/**
 * KHÔNG tạo Draft ở đây. Trang này chỉ ĐỌC — người dùng có thể ghé xem rồi
 * bấm "Huỷ" mà không để lại rác trong DB. Việc tạo/tái dùng Draft nằm trong
 * `openSessionAction`, chạy khi thật sự bấm "Bắt đầu phiên".
 *
 * Chỉ hiện đúng MỘT hàng — chính người dùng hiện tại — vì đó là participant
 * DUY NHẤT có thể tồn tại cho tới khi E3-T3/T4 (S2) cho thêm người khác. Xem
 * Implementation Guide §2.
 */
export default async function NewSessionPage({ params }: NewSessionPageProps) {
  const { groupId } = await params
  const { group, user } = await requireGroupContext(groupId)

  const decisionDate = resolveDecisionDate(new Date(), group.timezone)

  return (
    <StartSessionScreen
      dateCaption={formatVietnameseDate(decisionDate)}
      participants={[{ userId: user.id, displayName: user.displayName, error: null }]}
      blockText={null}
      action={openSessionAction.bind(null, groupId)}
    />
  )
}
