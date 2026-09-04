import { listGroupDishes } from '@/features/dish/application/list-group-dishes'
import { drizzleDishRepository } from '@/features/dish/infrastructure/drizzle-dish-repository'
import { DishCatalogScreen } from '@/features/dish/presentation/components/dish-catalog-screen'
import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import { drizzlePreferenceRepository } from '@/features/preference/infrastructure/drizzle-preference-repository'

import { requireGroupContext } from '../group-access'
import { addDishAction, reAddDishAction, removeDishAction, setSystemTagsAction } from './actions'

// Khai kiểu thủ công, KHÔNG dùng helper `PageProps<…>` (bẫy 3/9). Segment
// `dishes` là tĩnh nên `params` vẫn chỉ có `groupId` (bẫy 18).
type DishesPageProps = {
  params: Promise<{ groupId: string }>
}

export default async function DishesPage({ params }: DishesPageProps) {
  const { groupId } = await params
  const { user, group } = await requireGroupContext(groupId)

  const adminCheck = await assertGroupAccess(
    { memberships: drizzleMembershipRepository },
    { userId: user.id, groupId, requiredRole: 'ADMIN' },
  )
  const canEdit = adminCheck.ok

  const dishes = await listGroupDishes({ dishes: drizzleDishRepository }, groupId)
  const inactiveDishes = canEdit ? await drizzleDishRepository.listInactiveInGroup(groupId) : []

  // M3-T5 / SPEC-024 + SPEC-025 — trạng thái Like/Dislike/Cannot Eat của CHÍNH
  // người đang xem, để `E7-T5` có nửa còn thiếu của nó ở màn Danh mục.
  //
  // Đọc ở `app/` chứ KHÔNG khai chiều `dish → preference`: sở thích không phải
  // kiến thức miền của danh mục món, và `app/` vốn là chỗ hai feature gặp nhau
  // (trang này đã gọi `assertGroupAccess` của `group` theo đúng khuôn ấy).
  const [preferences, constrainedGlobalDishIds] = await Promise.all([
    drizzlePreferenceRepository.findPreferencesByGlobalDish(
      user.id,
      dishes.map((dish) => dish.globalDishId),
    ),
    drizzlePreferenceRepository.findConstrainedGlobalDishIds(user.id),
  ])

  const dishPreferences = dishes.map((dish) => ({
    groupDishId: dish.id,
    globalDishId: dish.globalDishId,
    preference: preferences.get(dish.globalDishId) ?? null,
    cannotEat: constrainedGlobalDishIds.has(dish.globalDishId),
  }))

  return (
    <DishCatalogScreen
      groupName={group.name}
      groupId={groupId}
      dishes={dishes}
      inactiveDishes={inactiveDishes}
      dishPreferences={dishPreferences}
      canEdit={canEdit}
      action={addDishAction.bind(null, groupId)}
      editAction={setSystemTagsAction.bind(null, groupId)}
      removeAction={removeDishAction.bind(null, groupId)}
      reAddAction={reAddDishAction.bind(null, groupId)}
    />
  )
}
