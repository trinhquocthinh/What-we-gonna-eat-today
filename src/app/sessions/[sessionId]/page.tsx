import { notFound, redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import {
  drizzleGroupRepository,
  drizzleMembershipRepository,
} from '@/features/group/infrastructure/drizzle-group-repository'
import { drizzleHistoryRepository } from '@/features/history/infrastructure/drizzle-history-repository'
import { drizzlePreferenceRepository } from '@/features/preference/infrastructure/drizzle-preference-repository'
import { listDeck } from '@/features/selection/application/list-deck'
import { drizzleSelectionRepository } from '@/features/selection/infrastructure/drizzle-selection-repository'
import { DeckScreen } from '@/features/selection/presentation/components/deck-screen'
import { sessionClosedReason } from '@/features/session/domain/session-openness'
import { drizzleSessionRepository } from '@/features/session/infrastructure/drizzle-session-repository'
import { ClosedSessionScreen } from '@/features/session/presentation/components/closed-session-screen'
import { resolveDecisionDate } from '@/shared/time/decision-date'
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

  // Một `Promise.all` chứ không hai lượt `await` nối tiếp: `NFR-01` (deck tải
  // ≤ 2.5s trên 4G) canh đúng đường này, và M3-T10 thêm một phép ĐỌC vào đây.
  const [access, group] = await Promise.all([
    assertGroupAccess(
      { memberships: drizzleMembershipRepository },
      { userId: user.id, groupId: session.groupId, requiredRole: 'MEMBER' },
    ),
    drizzleGroupRepository.findById(session.groupId),
  ])
  if (!access.ok || group === null) {
    notFound()
  }

  // M3-T10 / SPEC-034 / BR-055 — phiên không còn mở thì KHÔNG dựng deck.
  //
  // Quét lười (`invalidateExpiredSessions`) chỉ chạy ở Group Hub theo E11 Guide
  // §1.4, nên phiên hôm qua mở thẳng từ tab cũ vẫn mang `ACTIVE`. Chốt chặn ở
  // `finalizeSession` đã chặn phần HẬU QUẢ; chỗ này chặn phần TRẢI NGHIỆM —
  // trước M3 người dùng vuốt được cả deck rồi mới biết không lượt nào được ghi.
  //
  // Chỉ ĐỌC, không ghi: thêm một `UPDATE` vào đường tải deck là thứ E11 Guide
  // §1.4 đã cân nhắc và từ chối.
  const closedReason = sessionClosedReason({
    state: session.state,
    decisionDate: session.decisionDate,
    today: resolveDecisionDate(new Date(), group.timezone),
  })
  if (closedReason !== null) {
    return (
      <ClosedSessionScreen
        reason={closedReason}
        dateCaption={formatVietnameseDateShort(session.decisionDate)}
        groupHref={`/groups/${session.groupId}`}
        {...(closedReason === 'FINALIZED' ? { mealHref: `/sessions/${sessionId}/meal` } : {})}
      />
    )
  }

  const deck = await listDeck(
    {
      selection: drizzleSelectionRepository,
      history: drizzleHistoryRepository,
      preferences: drizzlePreferenceRepository,
    },
    {
      sessionId,
      userId: user.id,
      cursor: 0,
      pageSize: WHOLE_DECK_PAGE_SIZE,
      referenceDate: session.decisionDate,
    },
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
      courses={deck.value.courses}
      initialParticipantState={participantState}
      groupHref={`/groups/${session.groupId}`}
    />
  )
}
