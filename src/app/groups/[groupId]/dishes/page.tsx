import { listGroupDishes } from '@/features/dish/application/list-group-dishes'
import { drizzleDishRepository } from '@/features/dish/infrastructure/drizzle-dish-repository'
import { DishCatalogScreen } from '@/features/dish/presentation/components/dish-catalog-screen'

import { requireGroupContext } from '../group-access'
import { addDishAction, setSystemTagsAction } from './actions'

// Khai kiểu thủ công, KHÔNG dùng helper `PageProps<…>` (bẫy 3/9). Segment
// `dishes` là tĩnh nên `params` vẫn chỉ có `groupId` (bẫy 18).
type DishesPageProps = {
  params: Promise<{ groupId: string }>
}

export default async function DishesPage({ params }: DishesPageProps) {
  const { groupId } = await params
  const { group } = await requireGroupContext(groupId)

  const dishes = await listGroupDishes({ dishes: drizzleDishRepository }, groupId)

  return (
    <DishCatalogScreen
      groupName={group.name}
      dishes={dishes}
      action={addDishAction.bind(null, groupId)}
      editAction={setSystemTagsAction.bind(null, groupId)}
    />
  )
}
