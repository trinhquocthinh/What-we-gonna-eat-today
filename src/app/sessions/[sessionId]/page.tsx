import { notFound, redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import { listDeck } from '@/features/selection/application/list-deck'
import { drizzleSelectionRepository } from '@/features/selection/infrastructure/drizzle-selection-repository'
import { DeckScreen } from '@/features/selection/presentation/components/deck-screen'
import { drizzleSessionRepository } from '@/features/session/infrastructure/drizzle-session-repository'
import { formatVietnameseDateShort } from '@/shared/time/format-vietnamese-date'

// Khai kiểu thủ công, KHÔNG dùng helper `PageProps` (bẫy đã ghi ở S1-S4).
type SessionPageProps = {
  params: Promise<{ sessionId: string }>
}

// Đủ lớn để lấy TOÀN BỘ deck trong một lần — Tech Spec §3.3: Group ~30-100
// Dish, "không phân trang ở tầng DB". Xem Implementation Guide §2.4.
const WHOLE_DECK_PAGE_SIZE = 500

export default async function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params

  const user = await getCurrentUser()
  if (user === null) {
    redirect('/')
  }

  // Route PHẲNG, không có groupId trong URL (§2.2) — đọc Session trước để
  // biết Group nào mà gọi assertGroupAccess.
  const session = await drizzleSessionRepository.findById(sessionId)
  if (session === null) {
    notFound()
  }

  const access = await assertGroupAccess(
    { memberships: drizzleMembershipRepository },
    { userId: user.id, groupId: session.groupId, requiredRole: 'MEMBER' },
  )
  if (!access.ok) {
    notFound()
  }

  const deck = await listDeck(
    { selection: drizzleSelectionRepository },
    { sessionId, userId: user.id, cursor: 0, pageSize: WHOLE_DECK_PAGE_SIZE },
  )
  if (!deck.ok) {
    // ERR_NOT_PARTICIPANT — Group Member chưa từng được thêm vào Session này qua `addParticipant`.
    notFound()
  }

  const participantState = await drizzleSessionRepository.findParticipantState(sessionId, user.id)

  // listDeck ở trên đã thành công (participant ACTIVE|COMPLETED, không REMOVED) —
  // participantState ở đây không bao giờ null/REMOVED trong thực tế, nhưng vẫn
  // ép kiểu tường minh thay vì `as` để tsc bắt được nếu giả định này sai sau này.
  if (participantState !== 'ACTIVE' && participantState !== 'COMPLETED') {
    notFound()
  }

  return (
    <DeckScreen
      sessionId={sessionId}
      dateCaption={formatVietnameseDateShort(session.decisionDate)}
      dishes={deck.value.items}
      initialParticipantState={participantState}
    />
  )
}
