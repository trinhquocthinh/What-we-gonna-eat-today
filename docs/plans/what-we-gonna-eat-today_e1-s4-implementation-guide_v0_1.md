# Implementation Guide — E1 Slice S4 / Session tối thiểu

## Version 0.1

**Status:** Ready to code
**Created:** 2026-08-17
**Upstream:** Master Plan v1.0 §3 (E1-T6, E1-T7), SDD v0.2 SPEC-007 (SPEC-008 rút gọn), Tech Spec v0.2 §3.1–3.3/§8, Business Rules BR-020→BR-025, Test Cases v0.1 TC-026→TC-029, TC-107
**Tiền đề:** S1 (auth) và S2 (group) đã landed. S3 (dish) **chưa landed** — không sao, S4 không phụ thuộc S3.

> Tài liệu này là hướng dẫn thi công, không phải đặc tả. Khi nó lệch với SDD / Tech Spec / Business Rules thì **các tài liệu kia đúng**.

---

# 0. Phạm vi và điều kiện xong

| ID | Việc | Giờ | Xong nghĩa là |
|---|---|---|---|
| E1-T6 | Schema `selection_sessions`, `participants`, partial unique index | 2 | Migration tạo được index một phần; kiểm bằng `\d+` trong psql |
| E1-T7 | Tạo và Start Session, bắt lỗi unique violation | 2 | Hai Start đồng thời: đúng một thành công — **TC-107 phải chạy hai transaction song song thật** |

- [ ] TC-026, TC-027, TC-028, TC-029, TC-107 pass
- [ ] `psql "$DATABASE_URL" -c '\d+ selection_sessions'` cho thấy cả hai index, một cái có dòng `Predicate:`
- [ ] `yarn test:integration` chạy được 5 lần liên tiếp, TC-107 xanh cả 5 lần
- [ ] `yarn verify` · `yarn arch:probe` · `yarn build` xanh (không cần `DATABASE_URL_TEST`)
- [ ] PR link SPEC-007, BR-020, BR-025

**Slice này KHÔNG có UI, KHÔNG đụng `app/`.** Master Plan chỉ liệt kê `features/session/**` cho cả hai subtask. Việc nối Server Action tạo/bắt đầu phiên vào `app/` thuộc **E1-T8** (deck) hoặc **E3**. Ở S4, `createSession`/`startSession` chỉ được gọi từ test — không có route nào gọi chúng, và **không có `assertGroupAccess` nào chạy** (guard đó lắp ở `app/` khi có Server Action thật, đúng comment sẵn trong `eslint.config.mjs`). Đừng hoang mang vì thiếu authorization check ở slice này — nó không thuộc phạm vi.

---

# 1. Đính chính một quyết định đã ghi sai — đọc trước khi gõ

`docs/what-we-gonna-eat-today_decision-log_v1.1.md` **DEC-015** (viết lúc làm S2) kết luận:

> *"E1-T7 and E1-T11 need read-then-write inside the same transaction... Those slices must add the `neon-serverless` (WebSocket) driver instead of trying to force it through `batch()`."*

**Kết luận này sai cho E1-T7.** Sau khi đọc toàn văn SPEC-008:

- SPEC-008 **đầy đủ** (5 bước revalidate + snapshot Group Rule → Session Rule trong cùng transaction) là **E3-T1**, không phải E1-T7. Master Plan gán E1-T7 chỉ với `SPEC-007, TC-026→029, TC-107` — **không có SPEC-008** trong nguồn của E1-T7.
- "Start Session" rút gọn ở E1-T7 chỉ cần một câu lệnh: `UPDATE selection_sessions SET state='ACTIVE', started_at=now() WHERE id=$1 AND state='DRAFT'`. Postgres tự bọc single-statement trong transaction ngầm — không cần `db.batch()`, không cần transaction đa câu lệnh.
- Việc "chặn hai Start đồng thời" (BR-025, TC-107) không cần app tự làm gì đặc biệt: **partial unique index tự làm việc đó** ngay trong câu UPDATE đó. Khi hai UPDATE nhắm hai session khác nhau (cùng `group_id+decision_date`) chạy đồng thời, Postgres serialize chúng ở tầng index — một cái commit trước, cái kia nhận `unique_violation` (mã lỗi `23505`) ngay tại câu UPDATE của chính nó.
- `createSession` cần 2 INSERT nguyên tử (session + participant) — `db.batch()` xử lý đủ (không có bước đọc nào xen giữa, giống hệt tiền lệ `GroupRepository.createWithAdmin` của S2).

→ **E1-T7 không cần driver WebSocket.** Driver đó thật sự cần ở **E3-T1**, nơi phải *đọc* Group Rule hiện tại rồi *ghi* thành Session Rule + đổi state Session — đây mới là read-then-write thật trong một transaction.

S4 thêm **DEC-018** đính chính DEC-015 (§11.6) — **không xoá DEC-015**, giữ lại lịch sử suy luận và lý do đổi ý.

---

# 2. Ba phát hiện đã verify bằng đọc mã nguồn

## 2.1 `@neondatabase/serverless` export `DatabaseError` với `.code` và `.constraint`

`node_modules/@neondatabase/serverless/index.d.ts:313`:
```ts
export declare class DatabaseError extends Error {
  code: string | undefined         // mã lỗi Postgres — '23505' = unique_violation
  constraint: string | undefined   // tên constraint/index vi phạm
  detail: string | undefined
  // ...
}
```
Và `DatabaseError` **được export** ở `index.mjs` (không phải type nội bộ). `node_modules/drizzle-orm/neon-http/session.js` **không bọc try/catch** quanh câu query — lỗi từ `clientQuery` (hàm `neon()`) nổi nguyên vẹn lên infrastructure, giữ nguyên là instance `DatabaseError`. Đây là cơ sở để viết:

```ts
import { DatabaseError } from '@neondatabase/serverless'
// ...
try {
  // UPDATE ...
} catch (error) {
  if (error instanceof DatabaseError && error.code === '23505' && error.constraint === 'selection_sessions_active_per_group_date') {
    // BR-025 — đúng cái partial unique index chặn
  }
  throw error
}
```

## 2.2 `drizzle-orm/pg-core` hỗ trợ partial index qua `.where(condition: SQL)`

`node_modules/drizzle-orm/pg-core/indexes.d.ts`:
```ts
export declare class IndexBuilder {
  concurrently(): this
  with(obj: Record<string, any>): this
  where(condition: SQL): this
}
export declare function index(name?: string): IndexBuilderOn
export declare function uniqueIndex(name?: string): IndexBuilderOn
```
Viết được:
```ts
uniqueIndex('selection_sessions_active_per_group_date')
  .on(table.groupId, table.decisionDate)
  .where(sql`${table.state} in ('ACTIVE', 'FINALIZED')`)
```
**Còn là giả định**: tôi không có DB thật ở phiên đọc-only. **Bắt buộc đọc file `.sql` do `yarn db:generate` sinh ra** (§6.2) trước khi migrate, xác nhận có đúng mệnh đề `WHERE`.

## 2.3 `vitest.config.mts` hiện không nạp env nào, CI không có biến môi trường nào

S1/S2 chưa lộ ra vì mọi test đều mock port, không ai gọi `getDb()`. S4 là **integration test đầu tiên của dự án** — phải tự dựng: tách vitest unit/integration, nạp `.env.test.local`, thêm CI secret. `dotenv` đã có sẵn trong `devDependencies` (dùng bởi `drizzle.config.ts`) — không cần cài gì mới.

---

# 3. Ba quyết định thiết kế

## 3.1 `createSession` nhận `decisionDate` đã tính sẵn, không tự tính

`session` không import được `group` (ESLint `CROSS_FEATURE_ZONES` không có chiều này — đúng comment sẵn trong `eslint.config.mjs`: *"`session` không cần import `group`"*), mà chỉ `group` biết timezone của Group. → `createSession` nhận `decisionDate: string` (dạng `'YYYY-MM-DD'`) làm tham số đầu vào, do **caller** tính bằng `resolveDecisionDate(now, group.timezone)` — caller đó là test ở slice này, và sẽ là Server Action thật ở E1-T8/E3. `session/domain/decision-date.ts` (đã có từ E1-T4) vẫn ở nguyên chỗ cũ, `createSession` không gọi nó.

## 3.2 Một port `SessionRepository`, không tách như S2

Giống S3: chưa có consumer cắt ngang nào cần fake port cực ngắn ở slice này (khác S2, nơi `assertGroupAccess` được gọi ở mọi action nên phải tách `MembershipRepository` riêng). Một port ba method: `findBlockingSessionToday`, `createDraftWithCreatorParticipant`, `startDraft`.

## 3.3 `startDraft` trả kết quả phân biệt, không rò rỉ `DatabaseError` ra `application/`

SDD §2.3: *"infrastructure → application: entity domain, không rò rỉ kiểu ORM."* `infrastructure/drizzle-session-repository.ts` bắt `DatabaseError`, dịch thành một trong ba giá trị domain-shaped:
```ts
type StartDraftOutcome =
  | { readonly outcome: 'STARTED'; readonly session: SessionSummary }
  | { readonly outcome: 'NOT_DRAFT' }
  | { readonly outcome: 'ALREADY_EXISTS_TODAY' }
```
`application/start-session.ts` map `outcome` sang `Result<SessionSummary, Failure>` với `ERR_SESSION_NOT_DRAFT` / `ERR_SESSION_EXISTS_TODAY`. Không dùng `throw`/`catch` xuyên qua ranh giới application — application không biết `DatabaseError` tồn tại.

---

# 4. Cây file

```
src/
├── shared/
│   ├── db/schema.ts                                    SỬA — +sessionState, +participantState,
│   │                                                          +selectionSessions, +participants
│   └── testing/factories.ts                            SỬA — +makeSession, +makeParticipant
│
├── features/session/
│   ├── domain/session.ts                               mới — type thuần, không hàm
│   ├── application/session-repository.ts               mới — PORT
│   ├── application/create-session.ts    + .test.ts     mới — TC-026 (A)
│   ├── application/start-session.ts     + .test.ts     mới — SPEC-008 rút gọn (A, mock port)
│   └── infrastructure/
│       ├── drizzle-session-repository.ts                            mới
│       └── drizzle-session-repository.integration.test.ts           mới — TC-027/028/029, TC-107 (I)
│
├── tests/setup-integration.ts                          mới
└── (không đụng app/)

vitest.integration.config.mts                           mới
.env.test.example                                        mới
package.json                                              SỬA — +script test:integration
vitest.config.mts                                         SỬA — +exclude integration
.github/workflows/ci.yml                                  SỬA — +bước test:integration

src/shared/db/migrations/000X_selection_sessions_and_participants.sql   sinh bởi drizzle-kit
                                                          (SỐ TỰ SINH — xem §6.2, đừng hardcode)
```

---

# 5. Hạ tầng integration test

## 5.1 `.env.test.example` (mới, gốc repo)

```bash
# Chép file này thành .env.test.local rồi điền connection string của Neon branch
# TÊN "test" — TÁCH từ main, KHÁC branch "dev" mà .env.local trỏ tới.
#
# Vì sao một branch riêng: integration test xoá sạch bảng giữa các lần chạy
# (Test Cases §1.3). Chạy trên branch "dev" sẽ xoá luôn dữ liệu bạn đang dùng
# hằng ngày lúc `yarn dev`.
DATABASE_URL="postgresql://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/wwget?sslmode=require"
```

## 5.2 `src/tests/setup-integration.ts` (mới)

```ts
import { config } from 'dotenv'

/**
 * Nạp `.env.test.local` TRƯỚC khi bất kỳ file `*.integration.test.ts` nào gọi
 * `getDb()`. `vitest`, khác `next dev`/`next build`, KHÔNG tự nạp `.env.local`
 * — đây là lỗ hổng chưa lộ ra vì S1/S2 chưa có test nào chạm database thật.
 *
 * Đặt tên `.env.test.local` (không phải `.env.local`): tách bạch khỏi branch
 * "dev" mà `.env.local` trỏ tới, vì integration test xoá dữ liệu giữa các lần
 * chạy (Test Cases §1.3).
 */
config({ path: '.env.test.local', quiet: true })
```

## 5.3 `vitest.integration.config.mts` (mới, gốc repo)

```ts
import { defineConfig } from 'vitest/config'

/**
 * Cấu hình RIÊNG cho integration test — tách khỏi `vitest.config.mts` (unit).
 *
 * `environment: 'node'` chứ không `jsdom`: test này chạm database thật, không
 * cần DOM giả lập.
 *
 * `fileParallelism: false`: TC-107 tự nó là một test đo race condition có chủ
 * đích. Để file integration KHÁC chạy song song trên cùng Neon branch (compute
 * giới hạn ở free tier) là tự thêm nhiễu không kiểm soát được vào chính phép đo
 * đó. Chạy tuần tự đổi lấy chậm hơn — chấp nhận được, integration test vốn đã
 * "chậm hơn nhiều lần" (Test Cases §1.1).
 */
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/tests/setup-integration.ts'],
    include: ['src/**/*.integration.test.ts'],
    fileParallelism: false,
  },
})
```

## 5.4 `vitest.config.mts` — thêm `exclude`

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Integration test cần DATABASE_URL_TEST thật — không để `yarn test` (unit)
    // vô tình nhặt phải rồi đỏ trên máy chưa cấu hình `.env.test.local`.
    // Xem `vitest.integration.config.mts` cho `yarn test:integration`.
    exclude: ['**/*.integration.test.ts', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/features/*/domain/**/*.ts',
        'src/features/*/application/**/*.ts',
        'src/shared/time/**/*.ts',
      ],
    },
  },
})
```

> `'**/node_modules/**'` thêm vào `exclude` vì đặt `exclude` tường minh sẽ **ghi đè** default của Vitest (mặc định default `exclude` đã loại `node_modules`) — không thêm lại thì `node_modules` có thể bị quét. Xác nhận khi chạy `yarn test` lần đầu sau khi sửa: thời gian chạy không tăng bất thường.

## 5.5 `package.json` — thêm script

```json
"test:integration": "vitest run --config vitest.integration.config.mts",
```
Đặt ngay dưới dòng `"test:watch"`. Không sửa `"test"` (vẫn `vitest run`, giờ tự động loại integration nhờ `exclude` ở config).

---

# 6. Schema

## 6.1 `src/shared/db/schema.ts` — thêm

Import thêm `date`, `pgEnum` từ `drizzle-orm/pg-core`, và `sql` từ `drizzle-orm` (gốc, cho điều kiện partial index).

```ts
import { sql } from 'drizzle-orm'
import { boolean, date, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'
```

```ts
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
```

## 6.2 Migration

```bash
yarn db:generate --name=selection_sessions_and_participants
```

**Số thứ tự tự sinh — không hardcode trong bất kỳ tài liệu nào.** S3 (dish) chưa landed nhưng guide của nó giả định số `0002`. Nếu S4 chạy migration TRƯỚC S3, S4 chiếm `0002` và S3 thành `0003` — điều đó đúng, không phải lỗi. Sinh migration ở **commit riêng, cuối cùng**, ngay trước khi mở PR.

Đọc `.sql` sinh ra, xác nhận **ba điều bằng mắt**:
1. `CREATE TYPE "public"."session_state" AS ENUM(...)` và `CREATE TYPE "public"."participant_state" AS ENUM(...)` đứng trước `CREATE TABLE`.
2. `CREATE INDEX "selection_sessions_group_date_idx" ON "selection_sessions" ("group_id","decision_date");` — **không có** `WHERE`.
3. `CREATE UNIQUE INDEX "selection_sessions_active_per_group_date" ON "selection_sessions" ("group_id","decision_date") WHERE state in ('ACTIVE', 'FINALIZED');` — **có** `WHERE`. Nếu thiếu mệnh đề này, `.where()` của drizzle không hoạt động như tài liệu này giả định — dừng lại, đừng migrate, xem §12 rủi ro hàng đầu.

Migrate **cả hai branch** — `dev` (đã trỏ sẵn qua `.env.local`) và `test` (`.env.test.local`, xem §5.1):
```bash
yarn db:migrate                                    # branch dev, đọc .env.local
DATABASE_URL="$(grep DATABASE_URL .env.test.local | cut -d= -f2- | tr -d '"')" yarn db:migrate   # branch test
```

---

# 7. Domain

## 7.1 `src/features/session/domain/session.ts`

```ts
/**
 * SDD §2.2. Bản sao thuần của hai enum trong `src/shared/db/schema.ts`. Hai
 * chỗ KHÔNG ràng buộc nhau lúc biên dịch — `domain/` không được import
 * drizzle. Chỗ chúng gặp nhau và `tsc` canh được là
 * `infrastructure/drizzle-session-repository.ts`.
 *
 * Không có hàm nào ở đây tại S4 — không có luật nào đủ phức tạp để tách ra
 * (khác `group/domain/membership.ts`, nơi `isActiveMembership()` tồn tại vì
 * SPEC-019 cần một vị từ dùng lại được ở nhiều nơi). Thêm hàm khi có luật thật
 * cần, không thêm trước.
 */
export type SessionState = 'DRAFT' | 'ACTIVE' | 'FINALIZED' | 'INVALID'
export type ParticipantState = 'ACTIVE' | 'COMPLETED' | 'REMOVED'
```

---

# 8. Application

## 8.1 `src/features/session/application/session-repository.ts` — PORT

```ts
export type SessionSummary = {
  readonly id: string
  readonly groupId: string
  readonly decisionDate: string
  readonly state: 'DRAFT' | 'ACTIVE'
}

export type NewSessionDraft = {
  readonly groupId: string
  readonly decisionDate: string
  readonly creatorUserId: string
}

/**
 * Kết quả của `startDraft`, dịch sẵn từ mã lỗi Postgres — infrastructure
 * KHÔNG được để `DatabaseError` rò rỉ qua ranh giới này (SDD §2.3).
 */
export type StartDraftOutcome =
  | { readonly outcome: 'STARTED'; readonly session: SessionSummary }
  | { readonly outcome: 'NOT_DRAFT' }
  | { readonly outcome: 'ALREADY_EXISTS_TODAY' }

export interface SessionRepository {
  /**
   * SPEC-007. Chỉ Session `ACTIVE`/`FINALIZED` được tính — DRAFT/INVALID
   * KHÔNG chặn tạo Session mới (BR-025, TC-028).
   */
  findBlockingSessionToday(groupId: string, decisionDate: string): Promise<{ id: string } | null>

  /**
   * Chèn `selection_sessions` (DRAFT) + `participants` (creator, ACTIVE)
   * NGUYÊN TỬ (SDD §2.4). Người gọi trở thành Creator kiêm Participant
   * (SPEC-007, BR-020).
   */
  createDraftWithCreatorParticipant(input: NewSessionDraft): Promise<SessionSummary>

  /**
   * SPEC-008 rút gọn — một UPDATE có điều kiện `WHERE id=$1 AND state='DRAFT'`.
   * Dựa vào `selection_sessions_active_per_group_date` để bắt race (TC-107),
   * KHÔNG tự SELECT rồi so sánh state trước (Tech Spec §3.2 — race condition
   * ngay cả với hai người dùng).
   */
  startDraft(sessionId: string): Promise<StartDraftOutcome>
}
```

## 8.2 `src/features/session/application/create-session.ts`

```ts
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { SessionRepository, SessionSummary } from './session-repository'

export type CreateSessionDeps = {
  readonly sessions: SessionRepository
}

export type CreateSessionInput = {
  readonly groupId: string
  readonly creatorUserId: string
  /**
   * Đã tính sẵn bởi caller qua `resolveDecisionDate(now, group.timezone)`
   * (SPEC-018). `session` không import được `group` nên không tự tính ở đây —
   * xem Implementation Guide §3.1.
   */
  readonly decisionDate: string
}

/**
 * SPEC-007 — Tạo Session.
 *
 * KHÔNG gọi `assertGroupAccess` ở đây: guard đó chạy ở `app/`, trước khi use
 * case này được gọi (Tech Spec §5). S4 chưa có route nào gọi guard thật — sẽ
 * tới ở E1-T8/E3.
 */
export async function createSession(
  deps: CreateSessionDeps,
  input: CreateSessionInput,
): Promise<Result<SessionSummary, Failure>> {
  const blocking = await deps.sessions.findBlockingSessionToday(input.groupId, input.decisionDate)

  if (blocking !== null) {
    return err(
      failure('ERR_SESSION_EXISTS_TODAY', { groupId: input.groupId, decisionDate: input.decisionDate }),
    )
  }

  const created = await deps.sessions.createDraftWithCreatorParticipant({
    groupId: input.groupId,
    decisionDate: input.decisionDate,
    creatorUserId: input.creatorUserId,
  })

  return ok(created)
}
```

`create-session.test.ts` — **viết trước**:

```ts
import { describe, expect, it } from 'vitest'

import { makeGroup, makeUser } from '@/shared/testing/factories'

import type { NewSessionDraft, SessionRepository, SessionSummary } from './session-repository'
import { createSession } from './create-session'

type Row = NewSessionDraft & { id: string; state: 'DRAFT' }

/** Cổng giả là object thuần, không auto-mock (Test Cases §1.3). */
function makeFakeSessionRepository(seed: Row[] = []) {
  const rows: Row[] = [...seed]

  const repository: SessionRepository = {
    async findBlockingSessionToday() {
      // S4 chỉ có DRAFT/ACTIVE khả thi trong repo giả — "blocking" được mô
      // phỏng qua `seed` chứa sẵn một hàng coi như ACTIVE/FINALIZED.
      return null
    },
    async createDraftWithCreatorParticipant(input) {
      const id = `session-${rows.length + 1}`
      rows.push({ ...input, id, state: 'DRAFT' })
      return { id, groupId: input.groupId, decisionDate: input.decisionDate, state: 'DRAFT' }
    },
    async startDraft(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
  }

  return { repository, rows }
}

/** Biến thể chặn — mô phỏng đã có Session ACTIVE/FINALIZED hôm nay. */
function makeBlockingFakeSessionRepository(): SessionRepository {
  const base = makeFakeSessionRepository().repository
  return {
    ...base,
    async findBlockingSessionToday() {
      return { id: 'session-blocking' }
    },
  }
}

const GROUP_ID = makeGroup().id
const CREATOR = makeUser().id
const DECISION_DATE = '2026-08-17'

describe('SPEC-007 — Tạo Session', () => {
  it('TC-026: chưa có Session hôm nay thì tạo DRAFT, người tạo là Creator kiêm Participant', async () => {
    const fake = makeFakeSessionRepository()

    const result = await createSession(
      { sessions: fake.repository },
      { groupId: GROUP_ID, creatorUserId: CREATOR, decisionDate: DECISION_DATE },
    )

    expect(result.ok).toBe(true)
    expect(fake.rows).toHaveLength(1)
    expect(fake.rows[0]?.state).toBe('DRAFT')
    expect(fake.rows[0]?.creatorUserId).toBe(CREATOR)
    expect((result as { ok: true; value: SessionSummary }).value.state).toBe('DRAFT')
  })

  it('SPEC-007: đã có Session chặn hôm nay thì ERR_SESSION_EXISTS_TODAY và KHÔNG ghi thêm', async () => {
    const repository = makeBlockingFakeSessionRepository()
    let createCalls = 0
    const spied: SessionRepository = {
      ...repository,
      async createDraftWithCreatorParticipant(input) {
        createCalls += 1
        return repository.createDraftWithCreatorParticipant(input)
      },
    }

    const result = await createSession(
      { sessions: spied },
      { groupId: GROUP_ID, creatorUserId: CREATOR, decisionDate: DECISION_DATE },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_SESSION_EXISTS_TODAY')
    expect(createCalls).toBe(0)
  })
})
```

> Ghi chú cho bước RED: test đầu tiên (`TC-026`) đủ để chứng minh happy path. Test thứ hai không có TC chính thức (SPEC-007's nhánh chặn thuộc integration — TC-027/028/029 — vì cần dữ liệu real DB để phân biệt state; nhưng nhánh app-level "khi port báo blocking thì không gọi create" vẫn xứng đáng một test A-layer riêng, không trùng TC-ID nào).

## 8.3 `src/features/session/application/start-session.ts`

```ts
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { SessionRepository, SessionSummary } from './session-repository'

export type StartSessionDeps = {
  readonly sessions: SessionRepository
}

/**
 * SPEC-008 rút gọn — chỉ chuyển DRAFT sang ACTIVE, dựa vào partial unique
 * index để bắt BR-025 (TC-107).
 *
 * CỐ Ý CHƯA CÓ ở S4 (đều là E3-T1, xem Implementation Guide §0):
 * - kiểm người gọi là Creator (`ERR_NOT_SESSION_CREATOR`, TC-034)
 * - kiểm Participant vẫn là Group Member (`ERR_PARTICIPANT_NOT_MEMBER`, TC-031)
 * - snapshot Group Rule → Session Rule (SPEC-022, TC-030, TC-035)
 *
 * Trạng thái "không phải DRAFT" (TC-033) là hệ quả TỰ NHIÊN của mệnh đề WHERE
 * trong `startDraft`, không phải một bước revalidate riêng được thêm có chủ ý
 * — không thể triển khai UPDATE có điều kiện mà KHÔNG xử lý trường hợp "không
 * khớp điều kiện", nên `ERR_SESSION_NOT_DRAFT` ở đây không tính là mượn phạm
 * vi của E3-T1.
 */
export async function startSession(
  deps: StartSessionDeps,
  sessionId: string,
): Promise<Result<SessionSummary, Failure>> {
  const outcome = await deps.sessions.startDraft(sessionId)

  if (outcome.outcome === 'NOT_DRAFT') {
    return err(failure('ERR_SESSION_NOT_DRAFT', { sessionId }))
  }

  if (outcome.outcome === 'ALREADY_EXISTS_TODAY') {
    return err(failure('ERR_SESSION_EXISTS_TODAY', { sessionId }))
  }

  return ok(outcome.session)
}
```

`start-session.test.ts` — **viết trước**:

```ts
import { describe, expect, it } from 'vitest'

import type { SessionRepository, StartDraftOutcome } from './session-repository'
import { startSession } from './start-session'

function makeFakeSessionRepository(outcome: StartDraftOutcome): SessionRepository {
  return {
    async findBlockingSessionToday() {
      return null
    },
    async createDraftWithCreatorParticipant(): Promise<never> {
      throw new Error('không dùng trong test này')
    },
    async startDraft() {
      return outcome
    },
  }
}

describe('SPEC-008 rút gọn — Bắt đầu Session', () => {
  it('SPEC-008 rút gọn: Draft hợp lệ thì chuyển ACTIVE', async () => {
    const repository = makeFakeSessionRepository({
      outcome: 'STARTED',
      session: { id: 'session-1', groupId: 'group-1', decisionDate: '2026-08-17', state: 'ACTIVE' },
    })

    const result = await startSession({ sessions: repository }, 'session-1')

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.state).toBe('ACTIVE')
  })

  it('SPEC-008 rút gọn: session không ở DRAFT thì ERR_SESSION_NOT_DRAFT', async () => {
    const repository = makeFakeSessionRepository({ outcome: 'NOT_DRAFT' })

    const result = await startSession({ sessions: repository }, 'session-1')

    expect(result.ok === false && result.error.code).toBe('ERR_SESSION_NOT_DRAFT')
  })

  it('SPEC-008 rút gọn: đã có Session ACTIVE khác cùng ngày thì ERR_SESSION_EXISTS_TODAY', async () => {
    const repository = makeFakeSessionRepository({ outcome: 'ALREADY_EXISTS_TODAY' })

    const result = await startSession({ sessions: repository }, 'session-1')

    expect(result.ok === false && result.error.code).toBe('ERR_SESSION_EXISTS_TODAY')
  })
})
```

## 8.4 `src/shared/testing/factories.ts` — thêm

```ts
export type TestSession = {
  id: string
  groupId: string
  decisionDate: string
  state: 'DRAFT' | 'ACTIVE'
}

export function makeSession(overrides: Partial<TestSession> = {}): TestSession {
  return {
    id: '01920000-0000-7000-8000-0000000000b1',
    groupId: '01920000-0000-7000-8000-0000000000a1',
    decisionDate: '2026-08-17',
    state: 'DRAFT',
    ...overrides,
  }
}

export type TestParticipant = {
  id: string
  sessionId: string
  userId: string
  state: 'ACTIVE'
}

export function makeParticipant(overrides: Partial<TestParticipant> = {}): TestParticipant {
  return {
    id: '01920000-0000-7000-8000-0000000000c1',
    sessionId: '01920000-0000-7000-8000-0000000000b1',
    userId: '01920000-0000-7000-8000-000000000001',
    state: 'ACTIVE',
    ...overrides,
  }
}
```

---

# 9. Infrastructure

## 9.1 `src/features/session/infrastructure/drizzle-session-repository.ts`

```ts
import { DatabaseError } from '@neondatabase/serverless'
import { and, eq, inArray } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import { participants, selectionSessions } from '@/shared/db/schema'

import type {
  NewSessionDraft,
  SessionRepository,
  SessionSummary,
  StartDraftOutcome,
} from '../application/session-repository'

const UNIQUE_VIOLATION = '23505'
const SESSION_UNIQUENESS_CONSTRAINT = 'selection_sessions_active_per_group_date'

async function findBlockingSessionToday(
  groupId: string,
  decisionDate: string,
): Promise<{ id: string } | null> {
  // SPEC-007: chỉ ACTIVE/FINALIZED được tính (BR-025, TC-028: session INVALID
  // không chặn tạo mới nên KHÔNG đưa vào danh sách này). FINALIZED chưa tồn
  // tại được ở S4 (E1-T10) nhưng liệt kê sẵn để E1-T10 không phải sửa lại.
  const rows = await getDb()
    .select({ id: selectionSessions.id })
    .from(selectionSessions)
    .where(
      and(
        eq(selectionSessions.groupId, groupId),
        eq(selectionSessions.decisionDate, decisionDate),
        inArray(selectionSessions.state, ['ACTIVE', 'FINALIZED']),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

async function createDraftWithCreatorParticipant(input: NewSessionDraft): Promise<SessionSummary> {
  const db = getDb()
  const sessionId = uuidv7()
  const participantId = uuidv7()

  // `db.batch([...])` của neon-http LÀ một transaction Postgres thật
  // (đã verify ở S2/S3: `neon-http/session.js` gọi `client.transaction`).
  // Non-interactive — cả hai id sinh tường minh ở đây, không dựa `$defaultFn`.
  await db.batch([
    db.insert(selectionSessions).values({
      id: sessionId,
      groupId: input.groupId,
      decisionDate: input.decisionDate,
      creatorUserId: input.creatorUserId,
      state: 'DRAFT',
    }),
    db.insert(participants).values({
      id: participantId,
      sessionId,
      userId: input.creatorUserId,
      state: 'ACTIVE',
    }),
  ])

  return { id: sessionId, groupId: input.groupId, decisionDate: input.decisionDate, state: 'DRAFT' }
}

async function startDraft(sessionId: string): Promise<StartDraftOutcome> {
  try {
    const rows = await getDb()
      .update(selectionSessions)
      .set({ state: 'ACTIVE', startedAt: new Date() })
      .where(and(eq(selectionSessions.id, sessionId), eq(selectionSessions.state, 'DRAFT')))
      .returning({
        id: selectionSessions.id,
        groupId: selectionSessions.groupId,
        decisionDate: selectionSessions.decisionDate,
      })

    const updated = rows[0]
    if (updated === undefined) {
      // WHERE không khớp: session không tồn tại HOẶC không còn DRAFT. Không
      // phân biệt hai trường hợp — cả hai đều là "không start được từ đây".
      return { outcome: 'NOT_DRAFT' }
    }

    return { outcome: 'STARTED', session: { ...updated, state: 'ACTIVE' } }
  } catch (error) {
    // Hai Start đồng thời cho hai Draft khác nhau, cùng group+date: một UPDATE
    // thắng, cái kia vi phạm partial unique index khi commit (TC-107). Đây là
    // CHỖ DUY NHẤT trong feature này bắt lỗi Postgres thô — không để
    // DatabaseError rò rỉ qua khỏi hàm này (SDD §2.3).
    if (
      error instanceof DatabaseError &&
      error.code === UNIQUE_VIOLATION &&
      error.constraint === SESSION_UNIQUENESS_CONSTRAINT
    ) {
      return { outcome: 'ALREADY_EXISTS_TODAY' }
    }
    throw error
  }
}

export const drizzleSessionRepository: SessionRepository = {
  findBlockingSessionToday,
  createDraftWithCreatorParticipant,
  startDraft,
}
```

Không unit test riêng cho file này (Tech Spec §8.2: infrastructure không đặt ngưỡng) — nó **là** phần bị kiểm bởi integration test dưới đây.

## 9.2 `src/features/session/infrastructure/drizzle-session-repository.integration.test.ts`

```ts
import { and, eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { getDb } from '@/shared/db/client'
import { groupMembers, groups, participants, selectionSessions, users } from '@/shared/db/schema'

import { createSession } from '../application/create-session'
import { startSession } from '../application/start-session'
import { drizzleSessionRepository } from './drizzle-session-repository'

/**
 * Seed User + Group trực tiếp bằng insert qua `getDb()`, KHÔNG mượn
 * `drizzleUserRepository`/`drizzleGroupRepository` của feature khác. ESLint
 * nới `import/no-restricted-paths` cho file test nên cross-feature import kỹ
 * thuật là hợp lệ, nhưng test của `session` không nên phụ thuộc vào chi tiết
 * nội bộ của `auth`/`group` còn nguyên vẹn — insert thẳng vào bảng là cách
 * duy nhất tách bạch hoàn toàn.
 */
async function seedGroupAndUser() {
  const db = getDb()
  const userId = crypto.randomUUID()
  const groupId = crypto.randomUUID()

  await db.insert(users).values({
    id: userId,
    provider: 'test',
    providerSubject: `integration-${userId}`,
    email: `${userId}@example.test`,
    displayName: 'Integration Test User',
  })
  await db.insert(groups).values({ id: groupId, name: 'Integration Test Group', timezone: 'UTC' })
  await db.insert(groupMembers).values({ groupId, userId, isAdmin: true })

  return { userId, groupId }
}

async function cleanupSession(sessionId: string, groupId: string, userId: string) {
  const db = getDb()
  await db.delete(participants).where(eq(participants.sessionId, sessionId))
  await db.delete(selectionSessions).where(eq(selectionSessions.id, sessionId))
  await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
  await db.delete(groups).where(eq(groups.id, groupId))
  await db.delete(users).where(eq(users.id, userId))
}

const cleanupQueue: Array<() => Promise<void>> = []

afterEach(async () => {
  // Dọn theo thứ tự NGƯỢC với thứ tự tạo — FK đi từ participants → sessions →
  // group_members → groups → users.
  while (cleanupQueue.length > 0) {
    const cleanup = cleanupQueue.pop()
    if (cleanup !== undefined) {
      await cleanup()
    }
  }
})

describe('SPEC-007 — Tạo Session (integration)', () => {
  it('TC-027: đã có Session ACTIVE hôm nay thì ERR_SESSION_EXISTS_TODAY', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    const decisionDate = '2026-08-17'

    const first = await createSession(
      { sessions: drizzleSessionRepository },
      { groupId, creatorUserId: userId, decisionDate },
    )
    if (!first.ok) throw new Error('setup thất bại: không tạo được Session đầu tiên')
    const started = await startSession({ sessions: drizzleSessionRepository }, first.value.id)
    if (!started.ok) throw new Error('setup thất bại: không Start được Session đầu tiên')

    cleanupQueue.push(() => cleanupSession(first.value.id, groupId, userId))

    const second = await createSession(
      { sessions: drizzleSessionRepository },
      { groupId, creatorUserId: userId, decisionDate },
    )

    expect(second.ok === false && second.error.code).toBe('ERR_SESSION_EXISTS_TODAY')
  })

  it('TC-028: có Session INVALID hôm nay thì vẫn tạo được Session mới', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    const decisionDate = '2026-08-17'
    const db = getDb()

    // INVALID không tới được qua use case ở v1.0 (Tech Spec §3.2) — seed trực
    // tiếp để mô phỏng trạng thái mà một tính năng tương lai (Cancel Session)
    // sẽ tạo ra.
    const invalidSessionId = crypto.randomUUID()
    await db.insert(selectionSessions).values({
      id: invalidSessionId,
      groupId,
      decisionDate,
      creatorUserId: userId,
      state: 'INVALID',
    })
    cleanupQueue.push(async () => {
      await db.delete(selectionSessions).where(eq(selectionSessions.id, invalidSessionId))
    })

    const result = await createSession(
      { sessions: drizzleSessionRepository },
      { groupId, creatorUserId: userId, decisionDate },
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      cleanupQueue.push(() => cleanupSession(result.value.id, groupId, userId))
    }
    cleanupQueue.push(() => cleanupSession('', groupId, userId)) // xoá group/user một lần
  })

  it('TC-029: đã có Session FINALIZED hôm nay thì ERR_SESSION_EXISTS_TODAY', async () => {
    const { userId, groupId } = await seedGroupAndUser()
    const decisionDate = '2026-08-17'
    const db = getDb()

    const finalizedSessionId = crypto.randomUUID()
    await db.insert(selectionSessions).values({
      id: finalizedSessionId,
      groupId,
      decisionDate,
      creatorUserId: userId,
      state: 'FINALIZED',
    })
    cleanupQueue.push(async () => {
      await db.delete(selectionSessions).where(eq(selectionSessions.id, finalizedSessionId))
    })
    cleanupQueue.push(() => cleanupSession('', groupId, userId))

    const result = await createSession(
      { sessions: drizzleSessionRepository },
      { groupId, creatorUserId: userId, decisionDate },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_SESSION_EXISTS_TODAY')
  })
})

describe('BR-025 — race condition khi Start (TC-107)', () => {
  it('TC-107: hai Start đồng thời cho hai Draft cùng group+date, đúng một thành công', async () => {
    // Lặp 5 vòng trong MỘT test: TC-107 là phép đo race condition, không phải
    // khẳng định logic thuần tuý — một lần "ăn may" không chứng minh gì. Nếu
    // vòng nào cũng ra đúng-một-thắng thì mới tin cậy được partial unique
    // index chặn đúng.
    for (let round = 0; round < 5; round += 1) {
      const { userId, groupId } = await seedGroupAndUser()
      const decisionDate = '2026-08-17'

      // SPEC-007 cho phép nhiều Draft cùng group+date cùng lúc (BR-025: "Draft
      // và Invalid Session không block việc tạo một valid Session mới").
      const first = await createSession(
        { sessions: drizzleSessionRepository },
        { groupId, creatorUserId: userId, decisionDate },
      )
      const second = await createSession(
        { sessions: drizzleSessionRepository },
        { groupId, creatorUserId: userId, decisionDate },
      )
      if (!first.ok || !second.ok) {
        throw new Error(`setup thất bại ở vòng ${round}: không tạo được hai Draft`)
      }

      cleanupQueue.push(() => cleanupSession(first.value.id, groupId, userId))
      cleanupQueue.push(async () => {
        await getDb().delete(participants).where(eq(participants.sessionId, second.value.id))
        await getDb().delete(selectionSessions).where(eq(selectionSessions.id, second.value.id))
      })

      // Promise.allSettled, KHÔNG Promise.all: nếu implementation lỡ throw
      // thay vì trả Result, allSettled vẫn cho thấy cả hai nhánh thay vì làm
      // toàn bộ test fail ở đúng chỗ cần quan sát nhất.
      const [outcomeA, outcomeB] = await Promise.allSettled([
        startSession({ sessions: drizzleSessionRepository }, first.value.id),
        startSession({ sessions: drizzleSessionRepository }, second.value.id),
      ])

      const results = [outcomeA, outcomeB].map((settled) =>
        settled.status === 'fulfilled' ? settled.value : null,
      )

      const succeeded = results.filter((r) => r?.ok === true)
      const blocked = results.filter((r) => r?.ok === false && r.error.code === 'ERR_SESSION_EXISTS_TODAY')

      expect(outcomeA.status, `vòng ${round}: startSession không được throw`).toBe('fulfilled')
      expect(outcomeB.status, `vòng ${round}: startSession không được throw`).toBe('fulfilled')
      expect(succeeded, `vòng ${round}: đúng một Start thành công`).toHaveLength(1)
      expect(blocked, `vòng ${round}: đúng một Start bị chặn`).toHaveLength(1)
    }
  })
})
```

> Test trên có vài chỗ dọn dẹp hơi thô (`cleanupSession('', groupId, userId)` gọi với `sessionId` rỗng để tái dùng hàm xoá group/user) — chấp nhận được cho một test file, nhưng nếu thấy khó đọc, tách một hàm `cleanupGroupAndUser(groupId, userId)` riêng khỏi `cleanupSession` là cải thiện hợp lý, không bắt buộc.

---

# 10. Migration thủ công cho CI

## 10.1 `.github/workflows/ci.yml` — thêm bước

```yaml
      - name: Verify
        run: yarn verify

      - name: Kiểm luật kiến trúc
        run: yarn arch:probe

      # DATABASE_URL_TEST chỉ có ở repo chính — PR từ fork không nhận được
      # secret (đúng cơ chế bảo mật của GitHub Actions cho repo public), nên
      # bước này TỰ BỎ QUA thay vì đỏ CI của người khác.
      - name: Test tích hợp (cần DATABASE_URL_TEST)
        if: ${{ secrets.DATABASE_URL_TEST != '' }}
        run: yarn test:integration
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_TEST }}

      - name: Build
        run: yarn build
```

**Còn là giả định — verify khi đẩy PR đầu tiên**: cú pháp `if: ${{ secrets.X != '' }}` truy cập trực tiếp secret trong điều kiện `if:`. Tôi tin cú pháp này hợp lệ cho workflow chạy trong cùng repo (không phải fork), nhưng chưa chạy thật để xác nhận. Nếu GitHub Actions từ chối cú pháp này, phương án thay thế: đưa secret vào `env:` ở job level trước, rồi `if: ${{ env.HAS_TEST_DB == 'true' }}` với một bước tính `env.HAS_TEST_DB` từ `env.DATABASE_URL != ''`.

## 10.2 Việc bạn phải tự làm — Neon Console + GitHub

1. **Neon Console** → Project → Branches → **Create branch**, tách từ `main`, đặt tên **`test`**.
2. Lấy connection string của branch `test` (nhớ `?sslmode=require`).
3. Local: `cp .env.test.example .env.test.local`, điền connection string đó.
4. **GitHub** → Repo → Settings → Secrets and variables → Actions → **New repository secret**, tên `DATABASE_URL_TEST`, giá trị là cùng connection string.
5. Chạy `yarn db:migrate` với `DATABASE_URL` trỏ branch `test` (lệnh ở §6.2) để branch này có schema.

---

# 11. Cấu hình phải sửa

| File | Sửa gì |
|---|---|
| `src/shared/db/schema.ts` | +`sessionState`, +`participantState` (pgEnum), +`selectionSessions` (2 index), +`participants` |
| migrations | `yarn db:generate --name=selection_sessions_and_participants` — số tự sinh, không hardcode |
| `src/shared/testing/factories.ts` | +`makeSession`, +`makeParticipant` |
| `vitest.config.mts` | +`exclude: ['**/*.integration.test.ts', '**/node_modules/**']` |
| `vitest.integration.config.mts` | mới (§5.3) |
| `src/tests/setup-integration.ts` | mới (§5.2) |
| `.env.test.example` | mới (§5.1) |
| `package.json` | +script `test:integration` |
| `.github/workflows/ci.yml` | +bước integration test có điều kiện an toàn (§10.1) |
| `docs/..._setup-and-ops-guide_v0_1.md` | điền chi tiết Neon branch `test` + secret `DATABASE_URL_TEST` — bảng lệnh đã có sẵn dòng `yarn test:integration` nhưng chưa khớp code thật cho tới slice này |
| `docs/..._decision-log_v1.1.md` | +**DEC-018** (§11.6) |
| `docs/..._master-plan_v1_0.md` | tick E1-T6, E1-T7 |

**Không sửa**: `eslint.config.mjs` (`session` đã có trong `FEATURES`, không cần chiều cross-feature mới), `.jscpd.json`, `next.config.ts`, `drizzle.config.ts`, không có route/page nào trong `app/`.

## 11.6 `docs/..._decision-log_v1.1.md` — nội dung DEC-018

Thêm sau DEC-017, theo đúng khuôn các entry trước (tiêu đề, Date, Status, Decision, Rationale, Consequence, Affected Documents — bằng tiếng Anh, khớp văn phong đã có của file này):

```markdown
# DEC-018 — E1-T7's Minimal `startSession` Does Not Need the WebSocket Driver

**Date:** 2026-08-17
**Status:** Accepted

## Decision

DEC-015's consequence section claimed E1-T7 needs read-then-write inside a transaction, requiring the `neon-serverless` driver. This is corrected: E1-T7 implements only SPEC-007 (create) plus a minimal `startSession` — a single `UPDATE selection_sessions SET state='ACTIVE', started_at=now() WHERE id=$1 AND state='DRAFT'`. Postgres wraps a single statement in an implicit transaction; the partial unique index `selection_sessions_active_per_group_date` catches the BR-025 race at commit time, surfaced as a `DatabaseError` with `code==='23505'` caught in `infrastructure/drizzle-session-repository.ts`. `createSession`'s two inserts (session + participant) remain atomic via `db.batch()`, same pattern as `GroupRepository.createWithAdmin`.

## Rationale

Master Plan assigns E1-T7 only `SPEC-007, TC-026→029, TC-107` — not SPEC-008. Full SPEC-008 (5-step revalidation, Group Rule → Session Rule snapshot in one transaction) is E3-T1's scope. Conflating the two led DEC-015 to over-provision infrastructure for a slice that doesn't need it.

## Consequence

The `neon-serverless` (WebSocket) driver is deferred to **E3-T1**, where snapshotting Group Rule into Session Rule is a genuine read-then-write inside one transaction. `client.ts`'s comment (written at E0, before this analysis) should be read as "some future slice" rather than "E1-T7" specifically — a future pass may want to retarget that comment to E3-T1 explicitly.

## Affected Documents

- Decision Log DEC-015 (amended by this entry, not superseded)
- Tech Spec v0.2 §3.2, §4.1
```

---

# 12. Thứ tự thi công (TDD)

Nhánh `feat/session-minimum`. Conventional Commits, scope `session` / `db` / `test` / `ci` / `docs`.

| # | Việc | Test viết TRƯỚC | Tick |
|---|---|---|---|
| 0 | Tạo Neon branch `test` thủ công (§10.2) → `.env.test.local` | — | |
| 1 | Hạ tầng vitest: `vitest.config.mts` (exclude), `vitest.integration.config.mts`, `setup-integration.ts`, script `test:integration` | verify bằng một file `.integration.test.ts` rỗng đọc được `DATABASE_URL` | |
| 2 | `domain/session.ts` | không test (chỉ type) | |
| 3 | `schema.ts` → `yarn db:generate --name=selection_sessions_and_participants` → đọc `.sql`, xác nhận 3 điều ở §6.2 → migrate cả hai branch | | |
| 4 | port `session-repository.ts` + `create-session.ts` | **`create-session.test.ts` ĐỎ trước — TC-026** | |
| 5 | `start-session.ts` | **`start-session.test.ts` ĐỎ trước — SPEC-008 rút gọn** | |
| 6 | `infrastructure/drizzle-session-repository.ts` | không unit test (Tech Spec §8.2) | |
| 7 | `drizzle-session-repository.integration.test.ts`: TC-027, TC-028, TC-029 | `yarn test:integration` — infra đã có ở bước 6 nên đây là verify, không phải RED thuần | **E1-T6 + E1-T7 (SPEC-007)** |
| 8 | Thêm TC-107 vào cùng file | `yarn test:integration` **lặp lại ít nhất 5 lần liên tiếp** (không chỉ trong vòng lặp nội bộ của chính test — chạy cả lệnh 5 lần) | **E1-T7 (BR-025)** |
| 9 | `psql "$DATABASE_URL" -c '\d+ selection_sessions'` | xác nhận điều kiện xong của E1-T6 | **E1-T6** |
| 10 | CI: thêm bước, thêm secret, mở PR nháp kiểm CI xanh | | |
| 11 | DEC-018, setup guide, master plan | `yarn verify && yarn arch:probe && yarn build` | |
| 12 | PR link SPEC-007, BR-020, BR-025 | | |

---

# 13. Verify

## 13.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn build   # KHÔNG cần DATABASE_URL_TEST
yarn test:integration                           # cần .env.test.local
```

`yarn test` phải in nhóm `SPEC-007 — Tạo Session` (TC-026 + 1 test không TC) và `SPEC-008 rút gọn — Bắt đầu Session` (3 test không TC). `yarn test:integration` phải in `TC-027`, `TC-028`, `TC-029`, `TC-107`. Đính output cả hai vào PR.

## 13.2 `psql`

```bash
psql "$DATABASE_URL" -c '\d+ selection_sessions'
```
Kỳ vọng thấy trong phần Indexes:
```
"selection_sessions_group_date_idx" btree (group_id, decision_date)
"selection_sessions_active_per_group_date" UNIQUE, btree (group_id, decision_date) WHERE state = ANY (ARRAY['ACTIVE'::session_state, 'FINALIZED'::session_state])
```
(Postgres có thể viết lại `IN (...)` thành `= ANY(ARRAY[...])` khi hiển thị — đó là cùng một điều kiện, không phải lỗi.)

## 13.3 Độ tin cậy TC-107

```bash
for i in 1 2 3 4 5; do yarn test:integration || echo "LẦN $i ĐỎ"; done
```
Không dòng "LẦN N ĐỎ" nào xuất hiện. Nếu có, xem §14 rủi ro "TC-107 flaky".

## 13.4 CI

Mở PR nháp, xác nhận:
- `yarn verify`/`yarn arch:probe`/`yarn build` xanh không cần secret.
- Bước "Test tích hợp" chạy và xanh nếu secret `DATABASE_URL_TEST` đã cấu hình ở repo chính.
- (Nếu test được trên fork hoặc giả lập thiếu secret) bước đó bị skip, không đỏ toàn bộ pipeline.

---

# 14. Rủi ro

| Rủi ro | Dấu hiệu | Phương án |
|---|---|---|
| `yarn db:generate` không sinh đúng `WHERE` cho partial index | `.sql` thiếu mệnh đề `WHERE` ở `selection_sessions_active_per_group_date` | Đọc `.sql` trước khi migrate (§6.2). Nếu hỏng: viết SQL tay chèn vào file migration đã sinh, ghi vào decision log lý do phải sửa tay |
| TC-107 flaky vì độ trễ hai request HTTP không đối xứng | một nhánh luôn thắng ở mọi vòng lặp | Đã dùng `Promise.allSettled` + lặp 5 vòng trong test (§9.2). Nếu vẫn lệch hệ thống: đổi thứ tự gọi giữa các vòng (`round % 2 === 0 ? [a,b] : [b,a]`), hoặc chèn `await new Promise(r => setTimeout(r, Math.random() * 10))` trước mỗi lệnh gọi để phá vỡ độ trễ hệ thống |
| `DatabaseError` không phải instance đúng khi đi qua `drizzle-orm` (bị wrap lại) | `catch` ở `startDraft` không bắt được, lỗi ném thẳng ra ngoài, test đỏ với stack trace lạ | Đã verify `neon-http/session.js` không catch (§2.1) — nhưng verify lại bằng chạy test thật; nếu nghi ngờ, tạm thêm `console.log(error.constructor.name, (error as { code?: string }).code)` trong `catch` để soi |
| CI đỏ vì cú pháp `if: secrets.X != ''` không hợp lệ | bước integration test bị GitHub Actions từ chối syntax, hoặc luôn chạy/luôn skip sai | Xem phương án thay thế ở §10.1 (biến `env.HAS_TEST_DB` job-level) |
| Migration số thứ tự đụng với S3 nếu code sau | conflict `_journal.json` khi merge | Không hardcode số trong tài liệu nào; sinh migration ở commit cuối cùng, ngay trước PR |
| Integration test làm bẩn Neon branch `test` nếu `afterEach` lỗi giữa chừng | dữ liệu rác tích luỹ qua nhiều lần chạy | `cleanupQueue` chạy trong `afterEach`; nếu một bước cleanup throw, các bước sau trong hàng đợi vẫn không chạy — cân nhắc bọc từng `await cleanup()` trong try/catch riêng nếu thấy rác tích luỹ thật, nhưng đừng làm trước khi thấy vấn đề thật |
| `findBlockingSessionToday` để nguyên placeholder cố ý sai (§9.1) | TC-027/029 luôn pass sai (test không kiểm được gì vì hàm luôn trả blocking giả tùy `.find(() => true)`) | Bắt buộc thay bằng bản `inArray` đúng trước khi chạy bước 7 — đã cảnh báo ngay trong code mẫu |
| Hai FK `references()` bị quên khi copy code (§6.1 có bản trần rồi bản sửa) | migration thiếu ràng buộc khoá ngoại | Dùng đúng ba dòng "sau" ở cuối §6.1, không dùng bản đầu (`uuid(...).notNull()` trần) |
