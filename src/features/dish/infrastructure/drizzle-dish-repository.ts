import { and, asc, eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import { globalDishes, groupDishes } from '@/shared/db/schema'

import type {
  DishRepository,
  GlobalDishCandidate,
  GroupDishLookup,
  GroupDishSummary,
  NewDishInGroup,
} from '../application/dish-repository'
import type { GroupDishState } from '../domain/group-dish'

// `tsc` canh chỗ này: nếu enum DB và union domain lệch nhau thì phép gán đỏ.
// Đây là ràng buộc biên dịch DUY NHẤT giữa `schema.ts` và `domain/group-dish.ts`.
const ACTIVE: GroupDishState = 'ACTIVE'

/** KHÔNG lọc `state`: application quyết định — xem `add-dish-to-group.ts`. */
async function findInGroupByNormalizedName(
  groupId: string,
  normalizedName: string,
): Promise<GroupDishLookup | null> {
  const rows = await getDb()
    .select({
      id: groupDishes.id,
      name: globalDishes.name,
      state: groupDishes.state,
    })
    .from(groupDishes)
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .where(and(eq(groupDishes.groupId, groupId), eq(globalDishes.normalizedName, normalizedName)))
    .limit(1)

  return rows[0] ?? null
}

/**
 * Phạm vi TOÀN CỤC — không lọc theo group. Giới hạn 3 ứng viên theo đúng
 * thiết kế S-06 ("liệt kê tối đa 3 ứng viên"), cũ nhất trước (ưu tiên Global
 * Dish đã tồn tại lâu hơn — lựa chọn hợp lý mặc định, SPEC-005 không quy định
 * thứ tự).
 */
async function findGlobalCandidatesByNormalizedName(
  normalizedName: string,
): Promise<GlobalDishCandidate[]> {
  const db = getDb()
  return db
    .select({ id: globalDishes.id, name: globalDishes.name })
    .from(globalDishes)
    .where(eq(globalDishes.normalizedName, normalizedName))
    .orderBy(asc(globalDishes.createdAt))
    .limit(3)
}

/**
 * `db.batch([...])` của driver neon-http LÀ một transaction Postgres thật —
 * `neon-http/session.js` gọi `client.transaction(builtQueries)`. (Còn
 * `db.transaction()` thì ném "No transactions support in neon-http driver".)
 *
 * Batch non-interactive: không đọc được id ở giữa. Vì vậy CẢ HAI id sinh tường
 * minh ở đây — câu INSERT thứ hai cần `globalDishId` trước khi được dựng.
 *
 * Kiểu của `batch` là tuple `Readonly<[U, ...U[]]>` — truyền literal array,
 * đừng build bằng `.map()` hay gán vào `const queries: X[]`.
 */
async function createGlobalDishAndAddToPool(input: NewDishInGroup): Promise<GroupDishSummary> {
  const db = getDb()
  const globalDishId = uuidv7()
  const groupDishId = uuidv7()

  await db.batch([
    db.insert(globalDishes).values({
      id: globalDishId,
      name: input.name,
      normalizedName: input.normalizedName,
      // BR-001 — provenance. Ba giá trị này là điều kiện tồn tại của Global Dish.
      createdByUserId: input.creatorUserId,
      createdFromGroupId: input.groupId,
    }),
    db.insert(groupDishes).values({
      id: groupDishId,
      groupId: input.groupId,
      globalDishId,
      state: ACTIVE,
    }),
  ])

  return { id: groupDishId, name: input.name }
}

async function reactivateGroupDish(groupDishId: string): Promise<void> {
  const db = getDb()
  await db.update(groupDishes).set({ state: ACTIVE }).where(eq(groupDishes.id, groupDishId))
}

/**
 * Upsert trên unique index `group_dishes_group_global_unique(groupId, globalDishId)`
 * đã có từ E1-T5. Xử lý gọn cả "chưa từng có row" (INSERT bình thường) và "có
 * row nhưng INACTIVE" (ON CONFLICT chuyển ACTIVE) trong một câu — không cần
 * đọc trước để phân nhánh, vì cả hai kết quả mong muốn giống nhau.
 */
async function addExistingGlobalDishToGroup(input: {
  groupId: string
  globalDishId: string
}): Promise<GroupDishSummary> {
  const db = getDb()
  const id = uuidv7()

  await db
    .insert(groupDishes)
    .values({ id, groupId: input.groupId, globalDishId: input.globalDishId, state: ACTIVE })
    .onConflictDoUpdate({
      target: [groupDishes.groupId, groupDishes.globalDishId],
      set: { state: ACTIVE },
    })

  // onConflictDoUpdate().returning() chỉ trả cột của groupDishes, không có
  // tên món — join riêng để lấy `name` cho toast phía UI.
  const [dish] = await db
    .select({ id: groupDishes.id, name: globalDishes.name })
    .from(groupDishes)
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .where(
      and(eq(groupDishes.groupId, input.groupId), eq(groupDishes.globalDishId, input.globalDishId)),
    )
    .limit(1)

  if (dish === undefined) {
    throw new Error(
      'addExistingGlobalDishToGroup: không tìm thấy dòng vừa upsert — không nên xảy ra',
    )
  }

  return dish
}

async function listActiveInGroup(groupId: string): Promise<GroupDishSummary[]> {
  // `state = 'ACTIVE'` ở đây là câu hỏi "lấy dòng nào", không phải quyết định
  // nghiệp vụ — cùng ngoại lệ có chủ ý mà `listForUser` của S2 đã ghi.
  return getDb()
    .select({ id: groupDishes.id, name: globalDishes.name })
    .from(groupDishes)
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .where(and(eq(groupDishes.groupId, groupId), eq(groupDishes.state, ACTIVE)))
    .orderBy(asc(groupDishes.createdAt))
}

export const drizzleDishRepository: DishRepository = {
  findInGroupByNormalizedName,
  findGlobalCandidatesByNormalizedName,
  createGlobalDishAndAddToPool,
  reactivateGroupDish,
  addExistingGlobalDishToGroup,
  listActiveInGroup,
}
