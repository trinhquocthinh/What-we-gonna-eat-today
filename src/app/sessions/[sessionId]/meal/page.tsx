import { notFound, redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import {
  drizzleGroupRepository,
  drizzleMembershipRepository,
} from '@/features/group/infrastructure/drizzle-group-repository'
import { viewFinalMeal } from '@/features/meal/application/view-final-meal'
import { drizzleMealRepository } from '@/features/meal/infrastructure/drizzle-meal-repository'
import { FinalMealScreen } from '@/features/meal/presentation/components/final-meal-screen'
import { drizzleSessionRepository } from '@/features/session/infrastructure/drizzle-session-repository'
import { formatVietnameseDate } from '@/shared/time/format-vietnamese-date'
import { formatVietnameseTime } from '@/shared/time/format-vietnamese-time'

type MealPageProps = {
  params: Promise<{ sessionId: string }>
}

/* jscpd:ignore-start */
export default async function MealPage({ params }: MealPageProps) {
  const { sessionId } = await params

  const user = await getCurrentUser()
  if (user === null) redirect('/')

  const session = await drizzleSessionRepository.findById(sessionId)
  if (session === null) notFound()

  const access = await assertGroupAccess(
    { memberships: drizzleMembershipRepository },
    { userId: user.id, groupId: session.groupId, requiredRole: 'MEMBER' },
  )
  if (!access.ok) notFound()
  /* jscpd:ignore-end */

  const [meal, group] = await Promise.all([
    viewFinalMeal({ meal: drizzleMealRepository }, sessionId),
    drizzleGroupRepository.findById(session.groupId),
  ])

  if (meal === null || group === null) notFound()

  const finalizedCaption = `${meal.finalizedByDisplayName} chốt lúc ${formatVietnameseTime(
    meal.finalizedAt,
    group.timezone,
  )}`

  return (
    <FinalMealScreen
      dateCaption={formatVietnameseDate(meal.decisionDate)}
      finalizedCaption={finalizedCaption}
      dishes={meal.dishes}
      participantNames={meal.participantNames}
      closeHref={`/groups/${session.groupId}`}
    />
  )
}
