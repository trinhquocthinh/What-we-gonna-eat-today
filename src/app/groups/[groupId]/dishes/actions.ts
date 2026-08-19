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
  if (error.code === 'ERR_INVALID_SYSTEM_TAG') {
    return 'Chọn một nhãn để quy định bữa ăn kiểm tra được.'
  }
  return 'Không thêm được món. Thử lại giúp mình.'
}

export async function addDishAction(
  groupId: string,
  _previousState: AddDishFormState,
  formData: FormData,
): Promise<AddDishFormState> {
  const { user } = await requireGroupContext(groupId)

  const rawTag = formData.get('systemTag')

  const result = await addDishToGroup(
    { dishes: drizzleDishRepository },
    {
      groupId,
      creatorUserId: user.id,
      name: String(formData.get('name') ?? ''),
      // Chưa chọn thì gửi mảng RỖNG, không phải [''] — chuỗi rỗng sẽ thành
      // ERR_INVALID_SYSTEM_TAG và làm người dùng thấy sai thông điệp.
      systemTags: typeof rawTag === 'string' && rawTag !== '' ? [rawTag] : [],
      forceCreate: formData.get('forceCreate') === 'true',
    },
  )

  if (!result.ok) {
    const message = toVietnameseMessage(result.error)
    return result.error.code === 'ERR_INVALID_SYSTEM_TAG'
      ? { nameError: null, systemTagError: message, addedDishName: null }
      : { nameError: message, systemTagError: null, addedDishName: null }
  }

  // TODO(E2-T7): kind === 'candidates' hiện chỉ báo lỗi chung, chưa có UI
  // "Dùng món này" / "vẫn tạo mới" thật — S4 sẽ thay bằng duplicate-sheet.tsx
  // thật (S-06), gọi addExistingDishToGroupAction cho nhánh "Dùng món này".
  if (result.value.kind === 'candidates') {
    return {
      nameError: 'Nhà bạn đã có món gần giống, xem lại danh mục trước khi thêm.',
      systemTagError: null,
      addedDishName: null,
    }
  }

  revalidatePath(`/groups/${groupId}`)
  refresh()

  return { nameError: null, systemTagError: null, addedDishName: result.value.dish.name }
}
