import { and, asc, eq, sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import { globalDishes, groupDishes, groupDishTags } from '@/shared/db/schema'

import type {
  DishRepository,
  GlobalDishCandidate,
  GroupDishListItem,
  GroupDishLookup,
  GroupDishSummary,
  NewDishInGroup,
} from '../application/dish-repository'
import type { GroupDishState } from '../domain/group-dish'
import { toSystemTags, type SystemTag } from '../domain/system-tag'

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
 * SPEC-023 — gợi ý lúc đang gõ. Xem hợp đồng ở `dish-repository.ts`.
 *
 * `needle` PHẢI đã đi qua `readDishSearchQuery` (đã chuẩn hoá và đã lọc `%`,
 * `_`, `\`) — câu này nội suy nó vào `LIKE`, nên truyền chuỗi thô là mở đường
 * cho một dấu `%` khớp sạch catalog.
 *
 * Index btree `global_dishes_normalized_name_idx` KHÔNG phục vụ `LIKE '%…%'`
 * (mà dưới collation không phải `C` thì nó cũng chẳng phục vụ `LIKE 'q%'`).
 * Vài nghìn dòng thì seq scan không đáng kể; khi catalog lớn hẳn, lối thoát là
 * một index GIN `pg_trgm` — đúng thứ tăng tốc `LIKE '%…%'`, không phải viết
 * lại câu truy vấn.
 */
async function searchGlobalDishes(input: {
  groupId: string
  needle: string
  limit: number
}): Promise<GlobalDishCandidate[]> {
  const pattern = `%${input.needle}%`

  return (
    getDb()
      .select({ id: globalDishes.id, name: globalDishes.name })
      .from(globalDishes)
      .where(
        and(
          sql`${globalDishes.normalizedName} LIKE ${pattern}`,
          sql`NOT EXISTS (
          SELECT 1 FROM ${groupDishes}
          WHERE ${groupDishes.globalDishId} = ${globalDishes.id}
            AND ${groupDishes.groupId} = ${input.groupId}
            AND ${groupDishes.state} = 'ACTIVE'
        )`,
        ),
      )
      // Khớp từ đầu tên nổi lên trước, rồi tên ngắn ("Bún chả" trước "Bún chả
      // giò cuốn tôm thịt"), cuối cùng `created_at` để thứ tự luôn xác định.
      .orderBy(
        sql`position(${input.needle} in ${globalDishes.normalizedName})`,
        sql`length(${globalDishes.name})`,
        asc(globalDishes.createdAt),
      )
      .limit(input.limit)
  )
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
 * phần tử 0 là literal, phần đuôi spread từ `.map()`.
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
    ...input.systemTags.map((tag) =>
      db.insert(groupDishTags).values({ groupDishId, systemTag: tag }),
    ),
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

/**
 * `array_agg ... FILTER (WHERE ...)` để món KHÔNG có tag nào vẫn ra một hàng
 * với mảng rỗng — `LEFT JOIN` thuần sẽ cho `[null]` thay vì `[]`.
 *
 * `sql<string[]>` là một LỜI KHAI, không phải một phép kiểm: TypeScript tin
 * bạn, Postgres thì không hứa gì. Vì vậy kết quả đi qua `toSystemTags()` — bản
 * khoan dung — để một giá trị lạ trong DB không làm sập trang danh mục. Đây
 * cũng là chỗ mảng được sắp về THỨ TỰ CHUẨN, vì `array_agg` không đảm bảo thứ
 * tự.
 */
async function listActiveInGroup(groupId: string): Promise<GroupDishListItem[]> {
  const rows = await getDb()
    .select({
      id: groupDishes.id,
      name: globalDishes.name,
      systemTags: sql<
        string[]
      >`coalesce(json_agg(${groupDishTags.systemTag}) filter (where ${groupDishTags.systemTag} is not null), '[]'::json)`,
    })
    .from(groupDishes)
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .leftJoin(groupDishTags, eq(groupDishTags.groupDishId, groupDishes.id))
    .where(and(eq(groupDishes.groupId, groupId), eq(groupDishes.state, ACTIVE)))
    .groupBy(groupDishes.id, globalDishes.name, groupDishes.createdAt)
    .orderBy(asc(groupDishes.createdAt))

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    systemTags: toSystemTags(row.systemTags),
  }))
}

/**
 * Xác nhận món ĐANG ACTIVE trong ĐÚNG group này.
 *
 * Nhận CẢ HAI id là có chủ ý bảo mật: nếu chỉ nhận `groupDishId`, một Admin
 * của Group A gửi thẳng `groupDishId` của Group B sẽ qua được vòng kiểm
 * `assertGroupAccess` (vốn chỉ kiểm quyền trên Group A) rồi sửa tag của Group
 * B. Điều kiện `AND group_id = ?` ở đây là thứ chặn đúng chuyện đó.
 */
async function findActiveGroupDish(input: {
  groupId: string
  groupDishId: string
}): Promise<GroupDishSummary | null> {
  const rows = await getDb()
    .select({ id: groupDishes.id, name: globalDishes.name })
    .from(groupDishes)
    .innerJoin(globalDishes, eq(globalDishes.id, groupDishes.globalDishId))
    .where(
      and(
        eq(groupDishes.id, input.groupDishId),
        // Điều kiện làm nên vòng chặn chéo-Group — đừng bỏ.
        eq(groupDishes.groupId, input.groupId),
        eq(groupDishes.state, ACTIVE),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

/**
 * Ghi đè toàn bộ = XOÁ HẾT rồi CHÈN LẠI, trong MỘT transaction.
 *
 * `systemTags` rỗng (TC-023) thì batch còn đúng một câu DELETE — vẫn hợp lệ,
 * vì tuple chỉ đòi TỐI THIỂU một phần tử.
 */
async function replaceSystemTags(input: {
  groupDishId: string
  systemTags: readonly SystemTag[]
}): Promise<void> {
  const db = getDb()

  const remove = db.delete(groupDishTags).where(eq(groupDishTags.groupDishId, input.groupDishId))

  const add = input.systemTags.map((tag) =>
    db.insert(groupDishTags).values({ groupDishId: input.groupDishId, systemTag: tag }),
  )

  await db.batch([remove, ...add])
}

async function countActiveInGroup(groupId: string): Promise<number> {
  const rows = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(groupDishes)
    .where(and(eq(groupDishes.groupId, groupId), eq(groupDishes.state, ACTIVE)))

  return Number(rows[0]?.count ?? 0)
}

export const drizzleDishRepository: DishRepository = {
  findInGroupByNormalizedName,
  findGlobalCandidatesByNormalizedName,
  searchGlobalDishes,
  createGlobalDishAndAddToPool,
  reactivateGroupDish,
  addExistingGlobalDishToGroup,
  listActiveInGroup,
  findActiveGroupDish,
  replaceSystemTags,
  countActiveInGroup,
}
