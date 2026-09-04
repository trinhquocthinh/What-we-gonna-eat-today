import { listGroupDishes } from '@/features/dish/application/list-group-dishes'
import { drizzleDishRepository } from '@/features/dish/infrastructure/drizzle-dish-repository'
import { GroupOverviewScreen } from '@/features/group/presentation/components/group-overview-screen'
import { viewFinalMeal } from '@/features/meal/application/view-final-meal'
import { drizzleMealRepository } from '@/features/meal/infrastructure/drizzle-meal-repository'
import { listGroupRules } from '@/features/rule/application/list-group-rules'
import { drizzleRuleRepository } from '@/features/rule/infrastructure/drizzle-rule-repository'
import { resolveDecisionDate } from '@/shared/time/decision-date'
import { drizzleSessionRepository } from '@/features/session/infrastructure/drizzle-session-repository'
import { describeParticipantRow } from '@/features/session/presentation/components/participant-status'
import { formatVietnameseDate } from '@/shared/time/format-vietnamese-date'
import { formatVietnameseTime } from '@/shared/time/format-vietnamese-time'

import { requireGroupContext } from './group-access'

type GroupPageProps = {
  params: Promise<{ groupId: string }>
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { groupId } = await params
  const { user, group } = await requireGroupContext(groupId)

  // E1-T5 bật hàng lối tắt "Danh mục món", nên trang này phải biết số món.
  // E1-T7 gộp truy vấn khi trang nhóm cần thêm số liệu phiên.
  const dishes = await listGroupDishes({ dishes: drizzleDishRepository }, groupId)
  const rules = await listGroupRules({ rules: drizzleRuleRepository }, groupId)

  const decisionDate = resolveDecisionDate(new Date(), group.timezone)

  // SPEC-034 / BR-055 — quét lười đóng mọi phiên quá hạn của nhóm (Guide §1.4, §3.2)
  await drizzleSessionRepository.invalidateExpiredSessions(groupId, decisionDate)

  const blockingSession = await drizzleSessionRepository.findBlockingSessionToday(
    groupId,
    decisionDate,
  )

  const [activeSessionOverview, sessionForStart] =
    blockingSession !== null && blockingSession.state === 'ACTIVE'
      ? await Promise.all([
          drizzleSessionRepository.findSessionOverview(blockingSession.id),
          drizzleSessionRepository.findForStart(blockingSession.id),
        ])
      : [null, null]

  const finalized =
    blockingSession?.state === 'FINALIZED'
      ? await viewFinalMeal({ meal: drizzleMealRepository }, blockingSession.id)
      : null

  const isCreator = sessionForStart !== null && sessionForStart.creatorUserId === user.id

  const finalizedMeal =
    finalized !== null
      ? {
          // S-04 chip: "Đã chốt lúc 17:42 · Mẹ chốt" — khác thứ tự với caption
          // của S-11 ("Mẹ chốt lúc 17:42"), nên dựng riêng, không dùng chung.
          finalizedCaption: `Đã chốt lúc ${formatVietnameseTime(
            finalized.finalizedAt,
            group.timezone,
          )} · ${finalized.finalizedByDisplayName} chốt`,
          dishNames: finalized.dishes.map((d) => d.name),
          mealHref: `/sessions/${blockingSession!.id}/meal`,
        }
      : null

  return (
    <GroupOverviewScreen
      groupName={group.name}
      dateCaption={formatVietnameseDate(decisionDate)}
      dishCount={dishes.length}
      dishesHref={`/groups/${groupId}/dishes`}
      historyHref={`/groups/${groupId}/history`}
      inviteHref={`/groups/${groupId}/invite`}
      openSessionHref={`/groups/${groupId}/sessions/new`}
      rulesHref={`/groups/${groupId}/rules`}
      ruleCount={rules.length}
      activeSession={
        activeSessionOverview === null
          ? null
          : {
              id: blockingSession!.id,
              ...(isCreator ? { summaryHref: `/sessions/${blockingSession!.id}/summary` } : {}),
              participants: activeSessionOverview.participants.map((p) => ({
                ...p,
                statusLabel: describeParticipantRow(p, p.userId === user.id),
              })),
            }
      }
      finalizedMeal={finalizedMeal}
      currentUserId={user.id}
    />
  )
}
