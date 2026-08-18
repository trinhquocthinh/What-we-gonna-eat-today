'use server'

import { refresh, revalidatePath } from 'next/cache'

import { addDishToGroup } from '@/features/dish/application/add-dish-to-group'
import { drizzleDishRepository } from '@/features/dish/infrastructure/drizzle-dish-repository'
import type { AddDishFormState } from '@/features/dish/presentation/components/dish-catalog-screen'
import type { Failure } from '@/shared/errors'

import { requireGroupContext } from '../group-access'

// E6-T2 chuyển bảng này sang `shared/errors/messages.ts`. Ở đây chỉ có đúng
// những câu S-06 cần.
function toVietnameseMessage(error: Failure): string {
  if (error.code === 'ERR_DISH_ALREADY_IN_POOL') {
    return 'Món này đã có trong danh mục rồi.'
  }
  if (error.code === 'ERR_VALIDATION' && error.details?.['field'] === 'name') {
    return 'Nhập tên món trước đã.'
  }
  return 'Không thêm được món. Thử lại giúp mình.'
}

/**
 * Lắp ráp cho SPEC-005 rút gọn — không chứa business logic.
 *
 * Server Action gọi được bằng POST trực tiếp, không chỉ qua UI, nên
 * `requireGroupContext` chạy Ở ĐÂY chứ không dựa vào việc page đã guard
 * (Tech Spec §5).
 *
 * `groupId` tới từ `.bind()` ở page — vẫn không tin được, nên guard vẫn chạy
 * đủ trên chính giá trị đó.
 */
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
    },
  )

  if (!result.ok) {
    return { nameError: toVietnameseMessage(result.error), addedDishName: null }
  }

  // Trang nhóm hiện meta "{n} món" ở hàng lối tắt — số đó vừa cũ đi. Đường dẫn
  // LITERAL (đã nội suy groupId), KHÔNG truyền 'page': truyền '/groups/[groupId]'
  // sẽ xoá cache trang nhóm của MỌI nhóm (docs revalidatePath.md).
  revalidatePath(`/groups/${groupId}`)

  // Người dùng ở lại đúng trang vừa ghi. `refresh()` (mới ở Next 16, chỉ gọi
  // được trong Server Action) làm tươi client router của trang hiện tại — đúng
  // ca "read-your-own-writes" mà không đụng data cache của đường dẫn nào khác.
  refresh()

  return { nameError: null, addedDishName: result.value.name }
}
