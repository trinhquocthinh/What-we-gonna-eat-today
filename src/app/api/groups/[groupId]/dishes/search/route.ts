import { readDishSearchQuery } from '@/features/dish/domain/dish-search-query'
import { drizzleDishRepository } from '@/features/dish/infrastructure/drizzle-dish-repository'
import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import { httpStatusForErrorCode } from '@/shared/http-error'

import { requireApiUser } from '../../../../api-auth'

// Khai kiểu thủ công, KHÔNG dùng helper `RouteContext` (bẫy 19, §1.2).
type RouteParams = { params: Promise<{ groupId: string }> }

/** Thiết kế S-06 chừa chỗ cho vài dòng gợi ý — không phải một danh sách dài. */
const SUGGESTION_LIMIT = 5

/**
 * SPEC-023 — gợi ý món từ catalog chung trong lúc gõ.
 *
 * Route Handler chứ KHÔNG Server Action, cùng lý do Tech Spec §4.1 đã chốt cho
 * đường vuốt thẻ: React serialise các Server Action liên tiếp, nên phím thứ N+1
 * phải xếp hàng sau phím thứ N — đúng lúc người ta gõ nhanh thì càng dồn. Thêm
 * hai lý do riêng của typeahead: `fetch` huỷ được bằng `AbortController`, và
 * đây là phép ĐỌC nên không có cớ gì phải dựng lại cây RSC.
 *
 * PHẢI kiểm tư cách thành viên, không chỉ đăng nhập: kết quả đã LOẠI những món
 * nhóm đang có, nên ai đó dò `groupId` bất kỳ sẽ suy ra được danh mục của nhóm
 * đó qua chính những món bị thiếu. Phép lọc là thứ làm rò, không phải dữ liệu
 * `global_dishes` vốn dĩ dùng chung.
 *
 * Dùng `assertGroupAccess` chứ không `requireGroupContext`: hàm sau ném
 * `notFound()`/`redirect()` để trả HTML, vô nghĩa với một endpoint JSON.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser()
  if (!auth.ok) return auth.response

  const { groupId } = await params

  const access = await assertGroupAccess(
    { memberships: drizzleMembershipRepository },
    { userId: auth.user.id, groupId, requiredRole: 'MEMBER' },
  )
  if (!access.ok) {
    return Response.json(
      { code: access.error.code },
      { status: httpStatusForErrorCode(access.error.code) },
    )
  }

  const needle = readDishSearchQuery(new URL(request.url).searchParams.get('q') ?? '')

  // Gõ dở một chữ KHÔNG phải lỗi client — trả danh sách rỗng, không phải 400.
  // Trả 400 ở đây là rải lỗi đỏ khắp console trong lúc người ta gõ bình thường.
  if (needle === null) {
    return Response.json({ suggestions: [] })
  }

  const suggestions = await drizzleDishRepository.searchGlobalDishes({
    groupId,
    needle,
    limit: SUGGESTION_LIMIT,
  })

  // `id` là `global_dishes.id` — KHÔNG phải `group_dishes.id`. Trộn hai không
  // gian id này là lỗi khoá ngoại mà DEC-032 sinh ra để ngăn.
  return Response.json({ suggestions })
}
