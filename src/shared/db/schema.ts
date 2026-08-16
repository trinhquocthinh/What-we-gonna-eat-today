import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
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
