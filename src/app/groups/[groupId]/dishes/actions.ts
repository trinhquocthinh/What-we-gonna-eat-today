'use server'

import { refresh, revalidatePath } from 'next/cache'

import { addDishToGroup } from '@/features/dish/application/add-dish-to-group'
import { addExistingDishToGroup } from '@/features/dish/application/add-existing-dish-to-group'
import { setSystemTags } from '@/features/dish/application/set-system-tags'
import { drizzleDishRepository } from '@/features/dish/infrastructure/drizzle-dish-repository'
import type {
  AddDishFormState,
  EditDishFormState,
} from '@/features/dish/presentation/components/dish-catalog-screen'
import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import type { Failure } from '@/shared/errors'

import { requireGroupAdminContext, requireGroupContext } from '../group-access'

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

const EMPTY: AddDishFormState = {
  nameError: null,
  systemTagError: null,
  addedDishName: null,
  reusedDishName: null,
  candidates: [],
}

export async function addDishAction(
  groupId: string,
  _previousState: AddDishFormState,
  formData: FormData,
): Promise<AddDishFormState> {
  const { user } = await requireGroupContext(groupId)

  // Nhánh 1 — "Dùng món này" trên một ứng viên `global`. Giá trị tới từ
  // name/value của chính nút submit trong duplicate-sheet.tsx.
  const reuseId = formData.get('reuseGlobalDishId')
  if (typeof reuseId === 'string' && reuseId !== '') {
    const reused = await addExistingDishToGroup(
      { dishes: drizzleDishRepository },
      { groupId, globalDishId: reuseId },
    )
    if (!reused.ok) {
      return { ...EMPTY, nameError: 'Không dùng lại được món này. Thử lại giúp mình.' }
    }
    revalidatePath(`/groups/${groupId}`)
    refresh()
    return { ...EMPTY, reusedDishName: reused.value.name }
  }

  const forceCreate = formData.get('forceCreate') === 'true'

  // Nhánh 2 — client báo đang hiện ứng viên gần giống mà người dùng chưa xử lý.
  //
  // Đây là CỔNG XÁC NHẬN UX, KHÔNG phải kiểm soát bảo mật: cờ do client gửi
  // lên, giả mạo được dễ dàng, và hậu quả xấu nhất chỉ là tạo một món đáng lẽ
  // nên dùng lại. Đặt ở server để `add-dish-sheet.tsx` không phải chặn submit
  // bằng `preventDefault` + dò `event.submitter` — thứ jsdom không hứa hỗ trợ,
  // sẽ làm test giòn.
  if (!forceCreate && formData.get('hasNearMatch') === 'true') {
    return { ...EMPTY, nameError: 'Chọn “Dùng món này”, hoặc xác nhận đây là món khác.' }
  }

  // Nhánh 3 — thêm bình thường.
  const rawTag = formData.get('systemTag')
  const result = await addDishToGroup(
    { dishes: drizzleDishRepository },
    {
      groupId,
      creatorUserId: user.id,
      name: String(formData.get('name') ?? ''),
      systemTags: typeof rawTag === 'string' && rawTag !== '' ? [rawTag] : [],
      forceCreate,
    },
  )

  if (!result.ok) {
    const message = toVietnameseMessage(result.error)
    return result.error.code === 'ERR_INVALID_SYSTEM_TAG'
      ? { ...EMPTY, systemTagError: message }
      : { ...EMPTY, nameError: message }
  }

  // Server tìm thấy Global Dish trùng tên chính xác ở nhóm khác (S2, TC-018).
  if (result.value.kind === 'candidates') {
    return { ...EMPTY, candidates: result.value.candidates }
  }

  revalidatePath(`/groups/${groupId}`)
  refresh()
  return { ...EMPTY, addedDishName: result.value.dish.name }
}

export async function setSystemTagsAction(
  groupId: string,
  _previousState: EditDishFormState,
  formData: FormData,
): Promise<EditDishFormState> {
  // ADMIN, không phải MEMBER — BR-008/TC-025. `requireGroupAdminContext` tới từ
  // guide S1 §11 hoặc S3 §12.1.
  const { user } = await requireGroupAdminContext(groupId)

  const result = await setSystemTags(
    {
      dishes: drizzleDishRepository,
      assertAdmin: ({ userId, groupId: gid }) =>
        assertGroupAccess(
          { memberships: drizzleMembershipRepository },
          { userId, groupId: gid, requiredRole: 'ADMIN' },
        ),
    },
    {
      groupId,
      groupDishId: String(formData.get('groupDishId') ?? ''),
      // `getAll` chứ không `get`: checkbox cùng name gửi lên nhiều giá trị.
      systemTags: formData.getAll('systemTag').map(String),
      requestedByUserId: user.id,
    },
  )

  if (!result.ok) {
    return { error: 'Không lưu được nhãn. Thử lại giúp mình.', savedAt: null }
  }

  revalidatePath(`/groups/${groupId}/dishes`)
  refresh()
  return { error: null, savedAt: Date.now() }
}
