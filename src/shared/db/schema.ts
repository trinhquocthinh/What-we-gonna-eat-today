import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

/**
 * Tech Spec §3.1. Khoá chính là UUID v7 (sinh ở tầng ứng dụng, không phụ thuộc
 * phiên bản Postgres), thời điểm dùng `timestamptz`.
 *
 * Migration đầu tiên chỉ dựng `users` — đủ để E1-T1 gắn Auth.js vào. Các bảng
 * còn lại thêm dần theo từng epic, mỗi lần một migration đọc được.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),

    // SPEC-001: khoá định danh là provider + provider_subject, KHÔNG phải email.
    // Email đổi được, provider_subject thì không.
    provider: text('provider').notNull(),
    providerSubject: text('provider_subject').notNull(),

    email: text('email').notNull(),
    displayName: text('display_name').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_provider_subject_unique').on(table.provider, table.providerSubject),
  ],
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

/** Tech Spec §3.1. `timezone` là IANA, KHÔNG có default — SPEC-018 nói rõ
 *  "không có giá trị mặc định ẩn; tạo Group phải set". Ghi ở dạng canonical. */
export const groups = pgTable('groups', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  name: text('name').notNull(),
  timezone: text('timezone').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const groupMembers = pgTable(
  'group_members',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),

    // Tech Spec §3.2: `is_chef` CỐ Ý không có ở v1.0 dù F33 chắc chắn sẽ cần —
    // thêm một cột boolean sau này là migration tầm thường.
    isAdmin: boolean('is_admin').notNull().default(false),

    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),

    // null = đang hoạt động. Vị từ này phải phản chiếu `isActiveMembership()`
    // ở `features/group/domain/membership.ts`.
    removedAt: timestamp('removed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('group_members_group_user_unique').on(table.groupId, table.userId),
    // Đường nóng: mỗi lần mở /groups.
    index('group_members_user_id_idx').on(table.userId),
  ],
)

export type Group = typeof groups.$inferSelect
export type GroupMember = typeof groupMembers.$inferSelect

/**
 * SDD §2.2 `GroupDishState = ACTIVE | INACTIVE`. Khai bằng `pgEnum` chứ không
 * `text().$type<>()`: Postgres từ chối giá trị rác, và drizzle tự suy kiểu
 * literal union nên không phải khai hai lần. Thêm giá trị sau này chỉ cần sửa
 * mảng rồi `yarn db:generate` — drizzle-kit sinh `ALTER TYPE … ADD VALUE`.
 *
 * Bản sao ở tầng domain: `src/features/dish/domain/group-dish.ts`.
 */
export const groupDishState = pgEnum('group_dish_state', ['ACTIVE', 'INACTIVE'])

/** Tech Spec §3.1. BR-001: mọi Global Dish mới phải mang provenance tối thiểu —
 *  user đã tạo, group tạo từ đó, thời điểm tạo. Ba cột dưới KHÔNG được nullable. */
export const globalDishes = pgTable(
  'global_dishes',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),

    /** Dạng hiển thị, giữ nguyên hoa/thường và dấu — 'Cá basa kho tiêu'. */
    name: text('name').notNull(),

    /** SPEC-005. E1 = NFC + gộp khoảng trắng + trim + lowercase.
     *  E2-T3 thêm bỏ dấu VÀ phải backfill cột này. */
    normalizedName: text('normalized_name').notNull(),

    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdFromGroupId: uuid('created_from_group_id')
      .notNull()
      .references(() => groups.id),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Tech Spec §3.1. KHÔNG unique: E2-T4 cho `forceCreate` tạo Global Dish
    // thứ hai cùng tên khi người dùng xác nhận đó là món khác (BR-001).
    index('global_dishes_normalized_name_idx').on(table.normalizedName),
  ],
)

export const groupDishes = pgTable(
  'group_dishes',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id),
    globalDishId: uuid('global_dish_id')
      .notNull()
      .references(() => globalDishes.id),

    // BR-005: gỡ khỏi pool là chuyển INACTIVE, KHÔNG xoá dòng — historical
    // reference phải còn. Vì vậy không có `onDelete: 'cascade'` ở đâu cả.
    state: groupDishState('state').notNull().default('ACTIVE'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('group_dishes_group_global_unique').on(table.groupId, table.globalDishId),
    // Đường nóng Tech Spec §3.3: SPEC-010 eligible set.
    index('group_dishes_group_state_idx').on(table.groupId, table.state),
  ],
)

export type GlobalDish = typeof globalDishes.$inferSelect
export type GroupDish = typeof groupDishes.$inferSelect
