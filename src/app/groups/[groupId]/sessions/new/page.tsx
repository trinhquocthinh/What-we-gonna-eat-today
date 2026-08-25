import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
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
 * Liệt kê CẢ NHÀ, không riêng người đang bấm: bữa cơm là của cả nhóm, và
 * `openSessionAction` cũng thêm đúng danh sách này làm Participant. Bản E1
 * hardcode một hàng cho tới khi S2 cho thêm người — nhưng phần "thêm người"
 * chưa bao giờ được nối vào, nên mọi phiên chỉ có một người và Member khác mở
 * deck thì trúng `ERR_NOT_PARTICIPANT`.
 *
 * Người mở phiên đứng đầu danh sách vì hàng đầu mang nhãn
 * "Người mở phiên · chốt bữa".
 */
export default async function NewSessionPage({ params }: NewSessionPageProps) {
  const { groupId } = await params
  const { group, user } = await requireGroupContext(groupId)

  const decisionDate = resolveDecisionDate(new Date(), group.timezone)

  const members = await drizzleMembershipRepository.listActiveMembers(groupId)
  const ordered = [
    ...members.filter((m) => m.userId === user.id),
    ...members.filter((m) => m.userId !== user.id),
  ]

  return (
    <StartSessionScreen
      dateCaption={formatVietnameseDate(decisionDate)}
      participants={ordered.map((m) => ({
        userId: m.userId,
        displayName: m.displayName,
        error: null,
      }))}
      blockText={null}
      action={openSessionAction.bind(null, groupId)}
    />
  )
}
