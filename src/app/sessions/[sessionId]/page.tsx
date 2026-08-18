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
    // ERR_NOT_PARTICIPANT — thành viên Group nhưng chưa từng được thêm vào
    // Session này. E3-T3 (thêm Participant) sẽ cho lối vào hợp lệ; ở S5 chỉ
    // báo not found, không có UI riêng cho trường hợp này.
    notFound()
  }

  return (
    <DeckScreen
      sessionId={sessionId}
      dateCaption={formatVietnameseDateShort(session.decisionDate)}
      dishes={deck.value.items}
    />
  )
}
