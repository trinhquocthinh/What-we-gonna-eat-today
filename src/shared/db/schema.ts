import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  pgEnum,
  pgTable,
  primaryKey,
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

/** SDD §2.2 — bản sao DB của `SystemTag` ở `features/dish/domain/system-tag.ts`. */
export const systemTag = pgEnum('system_tag', ['STAPLE', 'MAIN', 'SIDE', 'SOUP', 'DESSERT'])

/**
 * Tech Spec §3.1 dòng 153–154. KHÔNG có cột `id` — khoá chính là cặp cột, cùng
 * khuôn `final_meal_items`.
 *
 * Khoá chính ghép LÀ luật khử trùng lặp của TC-101 ở mức DB: cùng một tag không
 * gắn hai lần vào một món. `readSystemTags` khử trước ở tầng domain, nên câu
 * INSERT không bao giờ chạm vào ràng buộc này — nó là lưới an toàn, không phải
 * đường đi chính.
 *
 * Trỏ `group_dish_id` chứ KHÔNG phải `global_dish_id`: đó chính là cơ chế cách
 * ly theo Group của TC-024. Cùng một Global Dish ở hai Group là hai hàng
 * `group_dishes` khác nhau, nên tag của chúng không có đường nào ảnh hưởng nhau
 * — cách ly là tính chất CẤU TRÚC, không phải điều kiện `WHERE` ai đó phải nhớ.
 */
export const groupDishTags = pgTable(
  'group_dish_tags',
  {
    groupDishId: uuid('group_dish_id')
      .notNull()
      .references(() => groupDishes.id),
    systemTag: systemTag('system_tag').notNull(),
  },
  (table) => [primaryKey({ columns: [table.groupDishId, table.systemTag] })],
)

export type GroupDishTag = typeof groupDishTags.$inferSelect

/**
 * SDD §2.2. `INVALID` nằm trong enum để máy trạng thái đầy đủ nhưng không tới
 * được ở v1.0 (F26/F41 là v1.2) — Tech Spec §3.2 đã ghi lý do không có cột
 * `invalid_reason`. `FINALIZED` chưa dùng tới ở S4 (E1-T10).
 */
export const sessionState = pgEnum('session_state', ['DRAFT', 'ACTIVE', 'FINALIZED', 'INVALID'])

/** SDD §2.2. Ở S4 chỉ `ACTIVE` khả thi — `COMPLETED` là SPEC-013 (E4),
 *  `REMOVED` là F25 (ngoài v1.0, SPEC-009 nói rõ). */
export const participantState = pgEnum('participant_state', ['ACTIVE', 'COMPLETED', 'REMOVED'])

/**
 * Tech Spec §3.1, §3.2, §3.3. Hai index KHÁC NHAU trên cùng cặp cột — mỗi cái
 * một việc:
 *
 * - `selection_sessions_group_date_idx` (thường): phục vụ existence-check của
 *   SPEC-007 — cần đọc MỌI state, kể cả DRAFT/INVALID (TC-028: session INVALID
 *   không chặn tạo Session mới).
 * - `selection_sessions_active_per_group_date` (partial unique): ép BR-025 ở
 *   tầng DB — chỉ tính ACTIVE/FINALIZED. Đây là index mà E1-T7's `startSession`
 *   dựa vào để bắt hai Start đồng thời (TC-107). Kiểm tra bằng SELECT rồi ghi ở
 *   application có race condition ngay cả với hai người dùng (Tech Spec §3.2);
 *   partial unique index là lý do chính chọn Postgres.
 */
export const selectionSessions = pgTable(
  'selection_sessions',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    // FK tới `groups`/`users` là chuyện toàn vẹn dữ liệu trong MỘT file
    // `shared/db/schema.ts` — tách biệt hoàn toàn khỏi luật "feature không
    // import feature" của ESLint (luật đó chỉ áp cho `src/features/**`, không
    // áp cho `shared/`). Hai bảng này cùng một schema Postgres nên tham chiếu
    // thẳng `groups.id`/`users.id` là đúng, không phải ngoại lệ.
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id),
    // `date` thuần (không timezone) — SDD §2.1: "Trường ngày lịch: `_date`,
    // date thuần". Giá trị đã quy đổi theo timezone của Group từ trước
    // (SPEC-018), không phải cột này tự quy đổi.
    decisionDate: date('decision_date').notNull(),
    creatorUserId: uuid('creator_user_id')
      .notNull()
      .references(() => users.id),
    state: sessionState('state').notNull().default('DRAFT'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),
  },
  (table) => [
    index('selection_sessions_group_date_idx').on(table.groupId, table.decisionDate),
    uniqueIndex('selection_sessions_active_per_group_date')
      .on(table.groupId, table.decisionDate)
      .where(sql`${table.state} in ('ACTIVE', 'FINALIZED')`),
  ],
)

export const participants = pgTable(
  'participants',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => selectionSessions.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    state: participantState('state').notNull().default('ACTIVE'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('participants_session_user_unique').on(table.sessionId, table.userId)],
)

export type SelectionSession = typeof selectionSessions.$inferSelect
export type Participant = typeof participants.$inferSelect

/**
 * SDD §2.2. Không có giá trị `NONE` — "None" = không tồn tại row (xem
 * `features/selection/domain/interaction.ts`).
 */
export const interactionType = pgEnum('interaction_type', ['SWIPE_RIGHT', 'SWIPE_LEFT'])

/**
 * Tên TỰ ĐẶT cho `interaction_events.action` — SDD không đặt tên riêng cho
 * enum này. Ba giá trị vì UNDO là một sự kiện audit dù nó xoá row khỏi
 * `interactions`.
 */
export const interactionAction = pgEnum('interaction_action', ['SWIPE_RIGHT', 'SWIPE_LEFT', 'UNDO'])

/**
 * Tech Spec §3.1, §3.2. Bảng EFFECTIVE STATE — luôn upsert, không append.
 * Session Ranking (E4+) CHỈ đọc bảng này, không đọc `interaction_events`
 * (Tech Spec §3.2: gộp làm một thì "mọi truy vấn ranking phải tự tìm bản ghi
 * mới nhất theo timestamp — đắt và dễ sai").
 */
export const interactions = pgTable(
  'interactions',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => selectionSessions.id),
    participantId: uuid('participant_id')
      .notNull()
      .references(() => participants.id),
    groupDishId: uuid('group_dish_id')
      .notNull()
      .references(() => groupDishes.id),
    type: interactionType('type').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('interactions_session_participant_dish_unique').on(
      table.sessionId,
      table.participantId,
      table.groupDishId,
    ),
    // Đường nóng Tech Spec §3.3: SPEC-014 Session Ranking (E4+).
    index('interactions_session_id_idx').on(table.sessionId),
  ],
)

/**
 * Tech Spec §3.1, §3.2. Bảng APPEND-ONLY AUDIT — mọi request SPEC-012 (dù có
 * đổi effective state hay không) đều thêm một dòng. KHÔNG dùng cho ranking.
 */
/* jscpd:ignore-start */
export const interactionEvents = pgTable('interaction_events', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => selectionSessions.id),
  participantId: uuid('participant_id')
    .notNull()
    .references(() => participants.id),
  groupDishId: uuid('group_dish_id')
    .notNull()
    .references(() => groupDishes.id),
  action: interactionAction('action').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
/* jscpd:ignore-end */

export type Interaction = typeof interactions.$inferSelect
export type InteractionEvent = typeof interactionEvents.$inferSelect

/**
 * Tech Spec §3.1, §3.2. ĐÂY LÀ BẢNG NHÁP — SPEC-015 ghi đè lên chính bảng
 * này trong lúc Session `ACTIVE`. "Authoritative Final Meal" (BR-050, BR-052)
 * hoàn toàn suy ra từ `selection_sessions.state = 'FINALIZED'`, KHÔNG có cột
 * trạng thái riêng ở đây — Tech Spec §3.2 đã cố ý bỏ `group_id`/`decision_date`
 * khỏi bảng này vì cả hai suy ra được qua `session_id`.
 */
export const finalMeals = pgTable(
  'final_meals',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => selectionSessions.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('final_meals_session_id_unique').on(table.sessionId)],
)

/**
 * KHÔNG có cột `id` — khoá chính là cặp cột, đúng nguyên văn Tech Spec §3.1.
 * Khác mọi bảng khác trong dự án tới giờ.
 */
export const finalMealItems = pgTable(
  'final_meal_items',
  {
    finalMealId: uuid('final_meal_id')
      .notNull()
      .references(() => finalMeals.id),
    groupDishId: uuid('group_dish_id')
      .notNull()
      .references(() => groupDishes.id),
  },
  (table) => [primaryKey({ columns: [table.finalMealId, table.groupDishId] })],
)

/**
 * Tech Spec §3.2: trỏ `global_dish_id`, KHÔNG phải `group_dish_id` — Eating
 * History thuộc về User chứ không thuộc Group (BR-056), để F43 multi-group
 * sau này collapse được cùng một User ăn cùng Dish ở hai Group thành một
 * eating event.
 */
export const eatingHistory = pgTable(
  'eating_history',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    globalDishId: uuid('global_dish_id')
      .notNull()
      .references(() => globalDishes.id),
    eatingDate: date('eating_date').notNull(),
    sourceFinalMealId: uuid('source_final_meal_id')
      .notNull()
      .references(() => finalMeals.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('eating_history_user_dish_date_source_unique').on(
      table.userId,
      table.globalDishId,
      table.eatingDate,
      table.sourceFinalMealId,
    ),
    // Đường nóng Tech Spec §3.3: SPEC-020 tính recency penalty (E4+).
    index('eating_history_user_dish_date_idx').on(
      table.userId,
      table.globalDishId,
      table.eatingDate.desc(),
    ),
  ],
)

export type FinalMeal = typeof finalMeals.$inferSelect
export type FinalMealItem = typeof finalMealItems.$inferSelect
export type EatingHistory = typeof eatingHistory.$inferSelect

/** Tech Spec dòng 135. SPEC-003/004 — DB CHỈ lưu hash, không bao giờ lưu token
 *  thô. `usedAt`/`usedByUserId` cùng null (chưa dùng) hoặc cùng khác null (đã
 *  dùng) — không có nửa vời; use case luôn set cả hai cùng lúc trong một câu
 *  SQL, xem `drizzle-invite-repository.ts`. */
export const groupInvites = pgTable(
  'group_invites',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    usedByUserId: uuid('used_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('group_invites_token_hash_unique').on(table.tokenHash)],
)

export type GroupInvite = typeof groupInvites.$inferSelect
export type NewGroupInvite = typeof groupInvites.$inferInsert
