import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
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
