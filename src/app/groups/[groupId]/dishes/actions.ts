'use server'

import { refresh, revalidatePath } from 'next/cache'

import { addDishToGroup } from '@/features/dish/application/add-dish-to-group'
import { drizzleDishRepository } from '@/features/dish/infrastructure/drizzle-dish-repository'
import type { AddDishFormState } from '@/features/dish/presentation/components/dish-catalog-screen'
import type { Failure } from '@/shared/errors'

import { requireGroupContext } from '../group-access'

function toVietnameseMessage(error: Failure): string {
  if (error.code === 'ERR_DISH_ALREADY_IN_POOL') {
    return 'Món này đã có trong danh mục rồi.'
  }
  if (error.code === 'ERR_VALIDATION' && error.details?.['field'] === 'name') {
    return 'Nhập tên món trước đã.'
  }
  return 'Không thêm được món. Thử lại giúp mình.'
}

export async function addDishAction(
  groupId: string,
  _previousState: AddDishFormState,
  formData: FormData,
): Promise<AddDishFormState> {
  const { user } = await requireGroupContext(groupId)

  const result = await addDishToGroup(
    { dishes: drizzleDishRepository },
    {
      groupId,
      creatorUserId: user.id,
      name: String(formData.get('name') ?? ''),
      forceCreate: formData.get('forceCreate') === 'true',
    },
  )

  if (!result.ok) {
    return { nameError: toVietnameseMessage(result.error), addedDishName: null }
  }

  // TODO(E2-T7): kind === 'candidates' hiện chỉ báo lỗi chung, chưa có UI
  // "Dùng món này" / "vẫn tạo mới" thật — S4 sẽ thay bằng duplicate-sheet.tsx
  // thật (S-06), gọi addExistingDishToGroupAction cho nhánh "Dùng món này".
  if (result.value.kind === 'candidates') {
    return {
      nameError: 'Nhà bạn đã có món gần giống, xem lại danh mục trước khi thêm.',
      addedDishName: null,
    }
  }

  revalidatePath(`/groups/${groupId}`)
  refresh()

  return { nameError: null, addedDishName: result.value.dish.name }
}
