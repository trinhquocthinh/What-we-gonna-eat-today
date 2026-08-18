# Implementation Guide — E2 Slice S1 / Link mời

## Version 0.1

**Status:** Ready to code (TDD)
**Created:** 2026-08-18
**Upstream:** Master Plan v1.0 §4 (E2-T1, E2-T2), SDD v0.1 SPEC-003/SPEC-004, Business Rules v1.6 BR-006/007/008, Test Cases v0.1 TC-011→016, TC-112, Tech Spec & Architecture v0.2 (schema line 135), Decision Log v1.1 (thêm DEC-021, DEC-022 ở cuối guide này)
**Tiền đề:** E1-T1 → E1-T11 đã có guide (S1-S6); slice này không phụ thuộc code thật đã chạy, chỉ phụ thuộc **thiết kế** của `group`/`dish` feature đã chốt ở các guide đó (port shape, `assertGroupAccess`, `requireGroupContext`, `db.batch` convention).

> Cách làm việc giống hệt sáu guide trước: TDD, viết test trước, code sau. Bạn tự code theo thứ tự trong guide; guide chỉ đưa code mẫu để bạn đối chiếu, không phải patch để dán.

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
|---|---|---|---|---|
| E2-T1 | Tạo link mời, lưu hash, hạn 7 ngày | 2 | `features/group/**` | DB chỉ chứa hash, không chứa token thô |
| E2-T2 | Tham gia bằng link, transaction, các trường hợp âm | 2 | `features/group/application/join-by-invite.ts` | TC-015 pass: Member cũ dùng token thì token **vẫn dùng được** cho người khác |

- [ ] `group_invites` có trong schema + migration `0003_group_invites.sql`
- [ ] `createInvite` pass TC-011, TC-012
- [ ] `joinByInvite` pass TC-013, TC-014, TC-015, TC-016, TC-112
- [ ] Test tích hợp chứng minh race hai lần dùng cùng token: lần hai `consumed: false`
- [ ] `yarn verify && yarn arch:probe` xanh

---

# 1. Việc KHÔNG làm ở slice này

- **Không làm màn "Thành viên"** (danh sách member, xoá member, đổi role Admin↔Member) — không thuộc E2-T1/T2, Master Plan không gán route nào cho việc này ở đây.
- **Không đổi `requireGroupContext`** hiện có — route `dishes/**` vẫn cần đúng `requiredRole: 'MEMBER'` như cũ. Slice này **thêm** `requireGroupAdminContext`, không sửa hàm cũ.
- **Không làm E2-T3→T7** (chuẩn hoá tên món, phát hiện trùng, System Tag, màn danh mục món) — các slice sau.
- **Không giới hạn số token chưa dùng của một Group** — SPEC-003 nói rõ "một Group có thể có nhiều token chưa dùng cùng lúc", không cần vô hiệu hoá token cũ khi tạo token mới.

---

# 2. Việc đã verify trước khi viết guide (để bạn không phải verify lại)

- Bốn mã lỗi cần dùng (`ERR_INVITE_INVALID`, `ERR_INVITE_ALREADY_USED`, `ERR_ALREADY_GROUP_MEMBER`, `ERR_NOT_GROUP_ADMIN`) **đã có sẵn** trong `src/shared/errors.ts` — không cần sửa file đó.
- `db.batch([...])` (dùng ở `group`/`dish` cho E1) chỉ hợp với "mọi giá trị biết trước, không đọc-giữa-chừng". Việc tham gia bằng link cần đọc trạng thái token trước để chọn đúng mã lỗi, RỒI ghi hai bảng cùng lúc có điều kiện — khác bản chất, xem §7.
- Đã đọc trực tiếp `node_modules/drizzle-orm/pg-core/db.d.ts` và `node_modules/@neondatabase/serverless/index.d.ts`: `db.execute(sql\`...\`)` trên driver `neon-http` trả về kiểu `Omit<FullQueryResults<false>, 'rows'> & { rows: T[] }` — có cả `rows: T[]` và `rowCount: number`. `sql` là tagged-template export từ gói `drizzle-orm` (`import { sql } from 'drizzle-orm'`). Đây là **lần đầu tiên** `db.execute` được dùng trong dự án — không có tiền lệ trong repo để đối chiếu, code mẫu ở §7 là thiết kế mới.
- Node `crypto` (`randomBytes`, `createHash`) **chưa từng dùng trong repo** — cũng là lần đầu, xem §4.
- `eslint.config.mjs`: `group` và `dish` không nằm trong `ALLOWED_CROSS_FEATURE` — không sao, mọi việc ở slice này nằm gọn trong feature `group`, không cần đổi ESLint config.

---

# 3. File tree — trước và sau slice này

```
src/features/group/
  domain/
    group-draft.ts / .test.ts        (đã có)
    membership.ts / .test.ts         (đã có)
    invite.ts                        + MỚI
    invite.test.ts                   + MỚI
  application/
    group-repository.ts              (đã có)
    membership-repository.ts         (đã có)
    create-group.ts / .test.ts       (đã có)
    list-groups.ts / .test.ts        (đã có)
    assert-group-access.ts / .test.ts (đã có — TÁI DÙNG nguyên vẹn)
    invite-repository.ts             + MỚI (port)
    create-invite.ts                 + MỚI
    create-invite.test.ts            + MỚI
    join-by-invite.ts                + MỚI
    join-by-invite.test.ts           + MỚI
  infrastructure/
    drizzle-group-repository.ts      (đã có)
    drizzle-invite-repository.ts     + MỚI
    drizzle-invite-repository.integration.test.ts  + MỚI
  presentation/components/
    ...(đã có)...
    invite-screen.tsx                + MỚI
    invite-screen.test.tsx           + MỚI

src/shared/
  crypto/
    invite-token.ts                  + MỚI (module mới, chưa có thư mục crypto/)
    invite-token.test.ts             + MỚI
  testing/factories.ts               SỬA (+makeInvite)
  db/schema.ts                       SỬA (+groupInvites)
  db/migrations/0003_group_invites.sql  + MỚI
  db/migrations/meta/_journal.json   SỬA (+entry idx 3)

src/app/
  groups/[groupId]/
    group-access.ts                  SỬA (+requireGroupAdminContext)
    invite/
      page.tsx                       + MỚI
      actions.ts                     + MỚI
  join/[token]/
    page.tsx                         + MỚI
    actions.ts                       + MỚI
```

---

# 4. `src/shared/crypto/invite-token.ts` — module mới, đọc trước khi viết

```ts
import { createHash, randomBytes } from 'node:crypto'

/**
 * SPEC-003: token ≥128-bit, ngẫu nhiên, DB chỉ lưu hash — KHÔNG BAO GIỜ lưu
 * token thô. `randomBytes(24)` = 192 bit, dư an toàn so với yêu cầu 128 bit.
 * `base64url` (không phải `base64`) để token an toàn khi nhét thẳng vào URL
 * (`/join/<token>`) mà không cần encode thêm — không có `+`, `/`, `=`.
 */
export function generateInviteToken(): string {
  return randomBytes(24).toString('base64url')
}

/**
 * SHA-256, không phải bcrypt/argon2: token đã có ≥192 bit entropy ngẫu nhiên
 * (khác mật khẩu người dùng tự chọn — không cần làm chậm để chống brute-force
 * từ điển). Hash chỉ để không lưu token thô trong DB, không phải để chống dò.
 */
export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
```

**Vì sao đặt ở `shared/crypto/`, không phải `features/group/domain/`**: đây là tiện ích hạ tầng chung (sinh số ngẫu nhiên, băm), không phải luật nghiệp vụ của "invite". `domain/**` toàn repo bị ESLint chặn import bất cứ thứ gì ngoài object/pure function thuần (ví dụ chặn `drizzle-orm*`, `process.env`) — về nguyên tắc `node:crypto` không nằm trong danh sách bị chặn hiện tại của `no-restricted-imports`, nhưng `generateInviteToken()` có random nên **không phải hàm thuần** — đặt trong `domain/` sẽ làm sai kỳ vọng "domain = pure, dễ test không mock" mà toàn bộ sáu guide trước đã giữ. `shared/crypto/` là lựa chọn nhất quán với `shared/time/`, `shared/db/` — hạ tầng dùng chung, không phải luật nghiệp vụ.

## 4.1 Test — `invite-token.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import { generateInviteToken, hashInviteToken } from './invite-token'

describe('generateInviteToken', () => {
  it('sinh token khác nhau mỗi lần gọi', () => {
    expect(generateInviteToken()).not.toBe(generateInviteToken())
  })

  it('không chứa ký tự cần encode trong URL', () => {
    expect(generateInviteToken()).toMatch(/^[A-Za-z0-9_-]+$/u)
  })
})

describe('hashInviteToken', () => {
  it('cùng token cho cùng hash (để tra cứu bằng hash)', () => {
    const token = generateInviteToken()
    expect(hashInviteToken(token)).toBe(hashInviteToken(token))
  })

  it('token khác nhau cho hash khác nhau', () => {
    expect(hashInviteToken('a')).not.toBe(hashInviteToken('b'))
  })
})
```

---

# 5. Schema — `src/shared/db/schema.ts`

Thêm vào cuối file (sau `groupDishes`), theo đúng khuôn các bảng đã có:

```ts
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
```

Không cần đổi dòng `import` đầu file — `boolean, index, pgTable, text, timestamp, uniqueIndex, uuid` đã import đủ.

## 5.1 Migration — `src/shared/db/migrations/0003_group_invites.sql`

Khuyến khích chạy `drizzle-kit generate` sau khi sửa `schema.ts` ở trên, để Drizzle Kit tự sinh cả file SQL lẫn file snapshot đi kèm trong `meta/` (snapshot không nên hand-craft). Nội dung SQL nên khớp với bản dưới đây — dùng để đối chiếu, không phải để chép tay nếu `drizzle-kit generate` đã chạy:

```sql
CREATE TABLE "group_invites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"used_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_used_by_user_id_users_id_fk" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_invites_token_hash_unique" ON "group_invites" USING btree ("token_hash");
```

## 5.2 `meta/_journal.json`

Thêm entry mới vào mảng `entries` (nếu không chạy `drizzle-kit generate`, tự thêm tay đúng khuôn ba entry đã có, `when` là mili-giây hiện tại):

```json
{
  "idx": 3,
  "version": "7",
  "when": 1787100000000,
  "tag": "0003_group_invites",
  "breakpoints": true
}
```

---

# 6. `src/features/group/domain/invite.ts` — MỚI

```ts
/**
 * SPEC-004 / TC-112 — biên ĐÓNG: token hết hạn ĐÚNG lúc `expiresAt` vẫn tính
 * là hết hạn (`now >= expiresAt`, không phải `now > expiresAt`).
 */
export function isInviteExpired(expiresAt: Date, now: Date): boolean {
  return now.getTime() >= expiresAt.getTime()
}
```

## 6.1 Test — `invite.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import { isInviteExpired } from './invite'

describe('isInviteExpired', () => {
  it('chưa hết hạn khi now < expiresAt', () => {
    const expiresAt = new Date('2026-08-25T00:00:00Z')
    const now = new Date('2026-08-24T23:59:59Z')
    expect(isInviteExpired(expiresAt, now)).toBe(false)
  })

  it('TC-112 — hết hạn ĐÚNG lúc expiresAt (biên đóng)', () => {
    const expiresAt = new Date('2026-08-25T00:00:00Z')
    expect(isInviteExpired(expiresAt, expiresAt)).toBe(true)
  })

  it('hết hạn khi now > expiresAt', () => {
    const expiresAt = new Date('2026-08-25T00:00:00Z')
    const now = new Date('2026-08-25T00:00:01Z')
    expect(isInviteExpired(expiresAt, now)).toBe(true)
  })
})
```

---

# 7. Port — `src/features/group/application/invite-repository.ts` — MỚI

```ts
export type InviteSummary = {
  readonly id: string
  readonly expiresAt: Date
}

export type NewInvite = {
  readonly groupId: string
  readonly tokenHash: string
  readonly expiresAt: Date
}

export type InviteLookup = {
  readonly id: string
  readonly groupId: string
  readonly expiresAt: Date
  readonly usedAt: Date | null
}

export type ConsumeInviteInput = {
  readonly inviteId: string
  readonly groupId: string
  readonly userId: string
}

export interface InviteRepository {
  create(input: NewInvite): Promise<InviteSummary>
  findByTokenHash(tokenHash: string): Promise<InviteLookup | null>
  consumeAndAddMember(input: ConsumeInviteInput): Promise<{ readonly consumed: boolean }>
}
```

`consumeAndAddMember` cố ý nhận cả `groupId` (không tự suy ra từ `inviteId` bên trong infra) — use case đã đọc invite trước đó rồi nên có sẵn `groupId`, truyền thẳng xuống tránh một round-trip đọc thừa trong infra.

---

# 8. Use case tạo link — `src/features/group/application/create-invite.ts` — MỚI

```ts
import { assertGroupAccess } from './assert-group-access'
import type { MembershipRepository } from './membership-repository'
import type { InviteRepository } from './invite-repository'
import { generateInviteToken, hashInviteToken } from '@/shared/crypto/invite-token'
import { failure, type Result } from '@/shared/result'
import type { Failure } from '@/shared/errors'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type CreateInviteDeps = {
  readonly invites: InviteRepository
  readonly memberships: MembershipRepository
}

export type CreateInviteInput = {
  readonly groupId: string
  readonly requestedByUserId: string
}

export type CreateInviteOutput = {
  readonly token: string
  readonly expiresAt: Date
}

export async function createInvite(
  deps: CreateInviteDeps,
  input: CreateInviteInput,
): Promise<Result<CreateInviteOutput, Failure>> {
  const access = await assertGroupAccess(
    { memberships: deps.memberships },
    { userId: input.requestedByUserId, groupId: input.groupId, requiredRole: 'ADMIN' },
  )
  if (!access.ok) {
    return access
  }

  const token = generateInviteToken()
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

  await deps.invites.create({
    groupId: input.groupId,
    tokenHash: hashInviteToken(token),
    expiresAt,
  })

  // Token thô CHỈ tồn tại trong biến này và giá trị trả về — không bao giờ
  // ghi xuống DB, không log. Đây là lần DUY NHẤT caller thấy được nó.
  return { ok: true, value: { token, expiresAt } }
}
```

Kiểm tra chữ ký thật của `Result`/`failure` trong `src/shared/result.ts` và `src/shared/errors.ts` trước khi code — `access` trả về từ `assertGroupAccess` đã là `Result<void, Failure>`, `return access` khi `!access.ok` hợp lệ vì TypeScript union-narrow đúng shape `{ ok: false, error: Failure }`.

## 8.1 Test — `create-invite.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest'

import { makeMembership } from '@/shared/testing/factories'

import { createInvite } from './create-invite'
import type { InviteRepository } from './invite-repository'
import type { MembershipRepository } from './membership-repository'

function makeDeps(overrides: {
  membership?: ReturnType<typeof makeMembership> | null
  createInvite?: InviteRepository['create']
} = {}) {
  const memberships: MembershipRepository = {
    findMembership: vi.fn().async(() =>
      overrides.membership === undefined ? makeMembership({ isAdmin: true }) : overrides.membership,
    ),
  }
  const invites: InviteRepository = {
    create:
      overrides.createInvite ??
      vi.fn(async (input) => ({ id: 'invite-1', expiresAt: input.expiresAt })),
    findByTokenHash: vi.fn(async () => null),
    consumeAndAddMember: vi.fn(async () => ({ consumed: true })),
  }
  return { memberships, invites }
}

describe('createInvite', () => {
  it('TC-011 — Admin tạo link: trả token + expiresAt, chỉ token hash được lưu', async () => {
    const create = vi.fn(async (input: Parameters<InviteRepository['create']>[0]) => ({
      id: 'invite-1',
      expiresAt: input.expiresAt,
    }))
    const deps = makeDeps({ createInvite: create })

    const result = await createInvite(deps, { groupId: 'g1', requestedByUserId: 'u1' })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.token).toMatch(/^[A-Za-z0-9_-]+$/u)
    expect(create).toHaveBeenCalledOnce()
    const savedInput = create.mock.calls[0]?.[0]
    expect(savedInput?.tokenHash).not.toBe(result.value.token)
    expect(savedInput?.tokenHash).toHaveLength(64) // sha256 hex
  })

  it('TC-011 — hạn 7 ngày kể từ lúc tạo', async () => {
    const deps = makeDeps()
    const before = Date.now()

    const result = await createInvite(deps, { groupId: 'g1', requestedByUserId: 'u1' })

    if (!result.ok) throw new Error('unreachable')
    const days = (result.value.expiresAt.getTime() - before) / (24 * 60 * 60 * 1000)
    expect(days).toBeGreaterThan(6.99)
    expect(days).toBeLessThan(7.01)
  })

  it('TC-012 — Member (không phải Admin) bị chặn: ERR_NOT_GROUP_ADMIN', async () => {
    const deps = makeDeps({ membership: makeMembership({ isAdmin: false }) })

    const result = await createInvite(deps, { groupId: 'g1', requestedByUserId: 'u1' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_NOT_GROUP_ADMIN')
  })
})
```

**Lưu ý cú pháp mock**: `vi.fn().async(...)` ở trên là giả — kiểm tra API thật của Vitest mock bạn đang dùng ở các test khác trong repo (`assert-group-access.test.ts`) và copy đúng khuôn `vi.fn(async (...) => ...)` từ đó thay vì tin theo đoạn trên chữ đối chữ; các guide trước đã nhấn mạnh "mock port bằng object thường, không dùng auto-mock library" — giữ nguyên tinh thần đó, phần quan trọng là *shape* của deps object và assertion, không phải cú pháp `vi.fn` chính xác.

---

# 9. Use case tham gia — `src/features/group/application/join-by-invite.ts` — MỚI

```ts
import { isInviteExpired } from '../domain/invite'
import type { MembershipRepository } from './membership-repository'
import type { InviteRepository } from './invite-repository'
import { hashInviteToken } from '@/shared/crypto/invite-token'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import type { Failure } from '@/shared/errors'
import { isActiveMembership } from '../domain/membership'

export type JoinByInviteDeps = {
  readonly invites: InviteRepository
  readonly memberships: MembershipRepository
}

export type JoinByInviteInput = {
  readonly token: string
  readonly userId: string
}

export type JoinByInviteOutput = {
  readonly groupId: string
}

export async function joinByInvite(
  deps: JoinByInviteDeps,
  input: JoinByInviteInput,
): Promise<Result<JoinByInviteOutput, Failure>> {
  const invite = await deps.invites.findByTokenHash(hashInviteToken(input.token))

  if (invite === null) {
    return { ok: false, error: failure('ERR_INVITE_INVALID') }
  }
  if (isInviteExpired(invite.expiresAt, new Date())) {
    return { ok: false, error: failure('ERR_INVITE_INVALID') }
  }
  if (invite.usedAt !== null) {
    return { ok: false, error: failure('ERR_INVITE_ALREADY_USED') }
  }

  // TC-015 — đã là Member: KHÔNG đánh dấu token đã dùng, token còn dùng được
  // cho người khác. Đọc trước batch/CTE bên dưới nên phải chặn ở đây, chưa
  // được để CTE tự chặn (CTE chỉ biết "used_at IS NULL", không biết membership).
  const existingMembership = await deps.memberships.findMembership(invite.groupId, input.userId)
  if (existingMembership !== null && isActiveMembership(existingMembership)) {
    return { ok: false, error: failure('ERR_ALREADY_GROUP_MEMBER') }
  }

  const { consumed } = await deps.invites.consumeAndAddMember({
    inviteId: invite.id,
    groupId: invite.groupId,
    userId: input.userId,
  })

  // Thua race cực hiếm: một request khác dùng đúng token này giữa lúc ta đọc
  // (findByTokenHash) và lúc ta ghi (consumeAndAddMember). CTE ở infra đã tự
  // chặn ghi trùng — ở đây chỉ cần dịch kết quả 0-hàng thành lỗi thay vì coi
  // là thành công.
  if (!consumed) {
    return { ok: false, error: failure('ERR_INVITE_ALREADY_USED') }
  }

  return { ok: true, value: { groupId: invite.groupId } }
}
```

Kiểm tra chữ ký thật của `failure()` trong `src/shared/errors.ts` trước khi code — theo báo cáo nghiên cứu, `failure(code, details?)` chỉ nhận 1-2 tham số, không nhận message string.

## 9.1 Test — `join-by-invite.test.ts`

Bao đúng TC-013→016, TC-112. Khung test (viết đủ trước khi code, theo TDD):

```ts
import { describe, expect, it, vi } from 'vitest'

import { makeMembership } from '@/shared/testing/factories'

import { joinByInvite } from './join-by-invite'
import type { InviteRepository, InviteLookup } from './invite-repository'
import type { MembershipRepository } from './membership-repository'

function makeInviteLookup(overrides: Partial<InviteLookup> = {}): InviteLookup {
  return {
    id: 'invite-1',
    groupId: 'g1',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    usedAt: null,
    ...overrides,
  }
}

function makeDeps(overrides: {
  invite?: InviteLookup | null
  membership?: ReturnType<typeof makeMembership> | null
  consumed?: boolean
} = {}) {
  const invites: InviteRepository = {
    create: vi.fn(async (i) => ({ id: 'x', expiresAt: i.expiresAt })),
    findByTokenHash: vi.fn(async () =>
      overrides.invite === undefined ? makeInviteLookup() : overrides.invite,
    ),
    consumeAndAddMember: vi.fn(async () => ({ consumed: overrides.consumed ?? true })),
  }
  const memberships: MembershipRepository = {
    findMembership: vi.fn(async () => overrides.membership ?? null),
  }
  return { invites, memberships }
}

describe('joinByInvite', () => {
  it('TC-013 — token hợp lệ, chưa dùng: tạo Member, trả groupId', async () => {
    const deps = makeDeps()

    const result = await joinByInvite(deps, { token: 'raw-token', userId: 'u2' })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.groupId).toBe('g1')
    expect(deps.invites.consumeAndAddMember).toHaveBeenCalledWith({
      inviteId: 'invite-1',
      groupId: 'g1',
      userId: 'u2',
    })
  })

  it('TC-014 — token đã dùng: ERR_INVITE_ALREADY_USED', async () => {
    const deps = makeDeps({ invite: makeInviteLookup({ usedAt: new Date() }) })

    const result = await joinByInvite(deps, { token: 'raw-token', userId: 'u2' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_INVITE_ALREADY_USED')
    expect(deps.invites.consumeAndAddMember).not.toHaveBeenCalled()
  })

  it('TC-015 — đã là Member: ERR_ALREADY_GROUP_MEMBER, token KHÔNG bị tiêu', async () => {
    const deps = makeDeps({ membership: makeMembership({ removedAt: null }) })

    const result = await joinByInvite(deps, { token: 'raw-token', userId: 'u2' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_ALREADY_GROUP_MEMBER')
    expect(deps.invites.consumeAndAddMember).not.toHaveBeenCalled()
  })

  it('TC-016 — token tạo 8 ngày trước (hết hạn): ERR_INVITE_INVALID', async () => {
    const deps = makeDeps({
      invite: makeInviteLookup({ expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) }),
    })

    const result = await joinByInvite(deps, { token: 'raw-token', userId: 'u2' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_INVITE_INVALID')
  })

  it('token không tồn tại: ERR_INVITE_INVALID', async () => {
    const deps = makeDeps({ invite: null })

    const result = await joinByInvite(deps, { token: 'raw-token', userId: 'u2' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_INVITE_INVALID')
  })

  it('thua race ở consumeAndAddMember: ERR_INVITE_ALREADY_USED', async () => {
    const deps = makeDeps({ consumed: false })

    const result = await joinByInvite(deps, { token: 'raw-token', userId: 'u2' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_INVITE_ALREADY_USED')
  })
})
```

**TC-112** (biên đóng) đã có test riêng ở domain layer (§6.1) — không lặp lại ở application layer, đúng nguyên tắc "mỗi hành vi test đúng một lần, ở tầng thấp nhất chứng minh được nó" đã giữ xuyên suốt các guide trước.

---

# 10. Infra — `src/features/group/infrastructure/drizzle-invite-repository.ts` — MỚI

```ts
import { sql } from 'drizzle-orm'
import { eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import { groupInvites } from '@/shared/db/schema'

import type { ConsumeInviteInput, InviteLookup, InviteRepository, NewInvite } from '../application/invite-repository'

async function create(input: NewInvite) {
  const db = getDb()
  const id = uuidv7()

  await db.insert(groupInvites).values({
    id,
    groupId: input.groupId,
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
  })

  return { id, expiresAt: input.expiresAt }
}

async function findByTokenHash(tokenHash: string): Promise<InviteLookup | null> {
  const db = getDb()
  const rows = await db
    .select({
      id: groupInvites.id,
      groupId: groupInvites.groupId,
      expiresAt: groupInvites.expiresAt,
      usedAt: groupInvites.usedAt,
    })
    .from(groupInvites)
    .where(eq(groupInvites.tokenHash, tokenHash))
    .limit(1)

  return rows[0] ?? null
}

/**
 * TẠI SAO một câu SQL thô (CTE) thay vì `db.batch([...])` như group/dish:
 * batch của neon-http là "non-interactive" — không đọc được kết quả câu
 * trước để quyết định câu sau trong cùng một lượt gọi. Nhưng ở đây câu ghi
 * THỨ HAI (insert membership) phải phụ thuộc vào việc câu ghi ĐẦU (đánh dấu
 * token đã dùng) có thực sự đổi được hàng nào không — nếu một request khác
 * đã dùng token này 1ms trước, KHÔNG được tạo membership.
 *
 * Một câu SQL với CTE (`WITH ... UPDATE ... RETURNING ... INSERT ... SELECT
 * FROM cte`) giải quyết gọn: Postgres chạy CTE atomic trong nội bộ MỘT
 * statement — không cần `db.transaction()` (driver neon-http không hỗ trợ,
 * ném lỗi), không cần driver WebSocket. Nếu UPDATE không đổi hàng nào (do
 * `used_at IS NOT NULL` — đã bị dùng), CTE `consumed` rỗng, INSERT...SELECT
 * FROM rỗng không chạy, `rows.length === 0` ở kết quả cuối.
 *
 * Đây là lần đầu dự án dùng `db.execute(sql\`...\`)` — xem DEC-022.
 */
async function consumeAndAddMember(
  input: ConsumeInviteInput,
): Promise<{ readonly consumed: boolean }> {
  const db = getDb()
  const memberId = uuidv7()

  const result = await db.execute<{ id: string }>(sql`
    WITH consumed AS (
      UPDATE group_invites
      SET used_at = now(), used_by_user_id = ${input.userId}
      WHERE id = ${input.inviteId} AND used_at IS NULL
      RETURNING id
    )
    INSERT INTO group_members (id, group_id, user_id, is_admin)
    SELECT ${memberId}, ${input.groupId}, ${input.userId}, false
    FROM consumed
    RETURNING id
  `)

  return { consumed: result.rows.length > 0 }
}

export const drizzleInviteRepository: InviteRepository = {
  create,
  findByTokenHash,
  consumeAndAddMember,
}
```

**Kiểm tra trước khi tin đoạn trên chữ đối chữ**: đây là code MỚI, chưa có tiền lệ trong repo — trước khi code thật, chạy thử một câu tương tự qua `yarn db:studio`'s SQL runner (hoặc `psql` trực tiếp vào Neon branch `test`) để xác nhận cú pháp CTE `INSERT ... SELECT ... FROM cte` chạy đúng như kỳ vọng trên Postgres phiên bản Neon đang dùng, TRƯỚC khi viết integration test — đúng tinh thần "verify qua chạy thật, không chỉ đọc doc" đã giữ xuyên suốt E1.

## 10.1 Integration test — `drizzle-invite-repository.integration.test.ts`

```ts
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'

import { getDb } from '@/shared/db/client'
import { groupInvites, groupMembers, groups, users } from '@/shared/db/schema'
import { makeGroup, makeUser } from '@/shared/testing/factories'

import { drizzleInviteRepository } from './drizzle-invite-repository'

describe('drizzleInviteRepository.consumeAndAddMember', () => {
  beforeEach(async () => {
    const db = getDb()
    await db.delete(groupMembers)
    await db.delete(groupInvites)
    await db.delete(groups)
    await db.delete(users)
  })

  it('cùng transaction: dùng token VÀ tạo member cùng lúc', async () => {
    const db = getDb()
    const user = makeUser()
    const group = makeGroup()
    await db.insert(users).values(user)
    await db.insert(groups).values(group)
    const invite = await drizzleInviteRepository.create({
      groupId: group.id,
      tokenHash: 'hash-1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    })

    const { consumed } = await drizzleInviteRepository.consumeAndAddMember({
      inviteId: invite.id,
      groupId: group.id,
      userId: user.id,
    })

    expect(consumed).toBe(true)
    const [savedInvite] = await db.select().from(groupInvites).where(eq(groupInvites.id, invite.id))
    expect(savedInvite?.usedAt).not.toBeNull()
    const members = await db.select().from(groupMembers).where(eq(groupMembers.userId, user.id))
    expect(members).toHaveLength(1)
  })

  it('race — token đã dùng: lần gọi thứ hai consumed=false, KHÔNG tạo member thứ hai', async () => {
    const db = getDb()
    const userA = makeUser({ id: '01920000-0000-7000-8000-0000000000f1', email: 'a@example.com' })
    const userB = makeUser({ id: '01920000-0000-7000-8000-0000000000f2', email: 'b@example.com' })
    const group = makeGroup()
    await db.insert(users).values([userA, userB])
    await db.insert(groups).values(group)
    const invite = await drizzleInviteRepository.create({
      groupId: group.id,
      tokenHash: 'hash-2',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    })

    const first = await drizzleInviteRepository.consumeAndAddMember({
      inviteId: invite.id,
      groupId: group.id,
      userId: userA.id,
    })
    const second = await drizzleInviteRepository.consumeAndAddMember({
      inviteId: invite.id,
      groupId: group.id,
      userId: userB.id,
    })

    expect(first.consumed).toBe(true)
    expect(second.consumed).toBe(false)
    const members = await db.select().from(groupMembers)
    expect(members).toHaveLength(1)
    expect(members[0]?.userId).toBe(userA.id)
  })
})
```

Test thứ hai ở trên là **tuần tự**, không phải hai request thật sự song song — nó chứng minh tính đúng đắn của điều kiện `WHERE used_at IS NULL` (idempotency khi gọi lại), không chứng minh race-condition dưới tải đồng thời thật. Đây là giới hạn đã biết và chấp nhận được cho một app hộ gia đình quy mô nhỏ — ghi rõ trong §13 Rủi ro, không giả vờ đây là proof-of-concurrency-safety đầy đủ.

---

# 11. Guard mới — `src/app/groups/[groupId]/group-access.ts`

**Sửa file đã có**, thêm hàm mới, giữ nguyên `requireGroupContext`:

```ts
export async function requireGroupAdminContext(groupId: string): Promise<GroupContext> {
  const user = await getCurrentUser()
  if (user === null) {
    redirect('/')
  }

  const access = await assertGroupAccess(
    { memberships: drizzleMembershipRepository },
    { userId: user.id, groupId, requiredRole: 'ADMIN' },
  )
  if (!access.ok) {
    notFound()
  }

  const group = await drizzleGroupRepository.findById(groupId)
  if (group === null) {
    notFound()
  }

  return { user, group }
}
```

Trùng lặp gần như toàn bộ với `requireGroupContext` — **cố ý không refactor gộp chung** ở slice này (chỉ khác một chữ `'MEMBER'`/`'ADMIN'`); nếu về sau có route thứ ba cần biến thể tương tự, lúc đó mới đáng rút thành một hàm chung nhận `requiredRole` làm tham số. "Ba lần giống nhau còn hơn một abstraction sớm" — giữ nguyên tinh thần đã dùng trong toàn bộ E1.

---

# 12. UI

## 12.1 `src/features/group/presentation/components/invite-screen.tsx` — MỚI

```tsx
'use client'

import { useActionState, useState } from 'react'

import { Button } from '@/shared/ui/button'

export type InviteFormState = {
  readonly token: string | null
  readonly expiresAt: string | null
  readonly error: string | null
}

type InviteScreenProps = {
  readonly groupName: string
  readonly action: (state: InviteFormState, formData: FormData) => Promise<InviteFormState>
}

export function InviteScreen({ groupName, action }: InviteScreenProps) {
  const [state, formAction, pending] = useActionState(action, {
    token: null,
    expiresAt: null,
    error: null,
  })
  const [copied, setCopied] = useState(false)

  const inviteUrl = state.token === null ? null : `${window.location.origin}/join/${state.token}`

  async function handleCopy() {
    if (inviteUrl === null) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-title font-semibold">Mời thành viên vào {groupName}</h1>

      {state.error !== null && <p className="text-body text-danger">{state.error}</p>}

      {inviteUrl !== null && state.expiresAt !== null && (
        <div className="rounded-card bg-surface-sunken p-4">
          <p className="text-caption text-ink-muted">
            Mỗi link dùng được một lần, cho một người. Hết hạn{' '}
            <span className="tabular-nums">
              {new Date(state.expiresAt).toLocaleDateString('vi-VN')}
            </span>
            .
          </p>
          <p className="mt-2 break-all font-mono text-body">{inviteUrl}</p>
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? 'Đã sao chép' : 'Sao chép link'}
          </Button>
        </div>
      )}

      <form action={formAction}>
        <Button type="submit" variant="primary" disabled={pending}>
          {state.token === null ? 'Tạo link mời' : 'Tạo link cho người tiếp theo'}
        </Button>
      </form>
    </div>
  )
}
```

Kiểm tra tên class token thật (`text-title`, `rounded-card`, `bg-surface-sunken`, `text-ink-muted`) đối chiếu `src/app/globals.css` trước khi code — các tên trên suy từ quy ước đã ghi lại trong các guide trước, không phải đọc lại file gốc lần này.

## 12.2 Route — `src/app/groups/[groupId]/invite/page.tsx` — MỚI

```tsx
import { InviteScreen } from '@/features/group/presentation/components/invite-screen'

import { requireGroupAdminContext } from '../group-access'
import { createInviteAction } from './actions'

type InvitePageProps = {
  params: Promise<{ groupId: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { groupId } = await params
  const { group } = await requireGroupAdminContext(groupId)

  return <InviteScreen groupName={group.name} action={createInviteAction.bind(null, groupId)} />
}
```

## 12.3 `src/app/groups/[groupId]/invite/actions.ts` — MỚI

```ts
'use server'

import { createInvite } from '@/features/group/application/create-invite'
import { drizzleInviteRepository } from '@/features/group/infrastructure/drizzle-invite-repository'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import type { InviteFormState } from '@/features/group/presentation/components/invite-screen'
import type { Failure } from '@/shared/errors'

import { requireGroupAdminContext } from '../group-access'

function toVietnameseMessage(error: Failure): string {
  if (error.code === 'ERR_NOT_GROUP_ADMIN') {
    return 'Chỉ Admin mới tạo được link mời.'
  }
  return 'Không tạo được link mời. Thử lại giúp mình.'
}

export async function createInviteAction(
  groupId: string,
  _previousState: InviteFormState,
): Promise<InviteFormState> {
  const { user } = await requireGroupAdminContext(groupId)

  const result = await createInvite(
    { invites: drizzleInviteRepository, memberships: drizzleMembershipRepository },
    { groupId, requestedByUserId: user.id },
  )

  if (!result.ok) {
    return { token: null, expiresAt: null, error: toVietnameseMessage(result.error) }
  }

  return {
    token: result.value.token,
    expiresAt: result.value.expiresAt.toISOString(),
    error: null,
  }
}
```

Action này **không** `revalidatePath`/`redirect` — khác `createGroupAction`/`addDishAction` — vì kết quả (token thô) chỉ có ý nghĩa hiển thị một lần ngay trên form, không phải dữ liệu cần đồng bộ lại từ server cache.

## 12.4 Route công khai — `src/app/join/[token]/page.tsx` — MỚI

```tsx
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'

import { joinAction } from './actions'

type JoinPageProps = {
  params: Promise<{ token: string }>
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params
  const user = await getCurrentUser()
  if (user === null) {
    redirect(`/?joinToken=${encodeURIComponent(token)}`)
  }

  const result = await joinAction(token, user.id)

  if (!result.ok) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center">
        <p className="text-body">{result.message}</p>
      </div>
    )
  }

  redirect(`/groups/${result.groupId}`)
}
```

**Lưu ý bẫy Next 16**: `redirect()` ném lỗi, phải đứng NGOÀI khối điều kiện gói bằng try/catch và là câu lệnh CUỐI trong nhánh thành công — đúng bẫy #đã ghi ở các guide trước, nhắc lại vì đây là chỗ dễ quên khi route mới không copy nguyên khối từ route cũ.

**Chưa xử lý**: người dùng chưa đăng nhập bị đưa về `/` kèm `?joinToken=...` — màn hình đăng nhập (`S-01`, đã code ở E1-T1) hiện KHÔNG đọc query này để tự động điều hướng lại sau khi đăng nhập xong. Việc nối lại luồng "đăng nhập → tự quay lại join" **không nằm trong ước lượng 2h của E2-T2** — ghi vào rủi ro (§13), người dùng đăng nhập trước rồi bấm lại link mời là lối thoát tạm chấp nhận được cho một sản phẩm hộ gia đình.

## 12.5 `src/app/join/[token]/actions.ts` — MỚI

```ts
'use server'

import { joinByInvite } from '@/features/group/application/join-by-invite'
import { drizzleInviteRepository } from '@/features/group/infrastructure/drizzle-invite-repository'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'

function toVietnameseMessage(code: string): string {
  if (code === 'ERR_INVITE_INVALID') return 'Link mời không còn hiệu lực.'
  if (code === 'ERR_INVITE_ALREADY_USED') return 'Link mời này đã được dùng rồi.'
  if (code === 'ERR_ALREADY_GROUP_MEMBER') return 'Bạn đã ở trong nhóm này rồi.'
  return 'Không tham gia được nhóm. Thử lại giúp mình.'
}

export async function joinAction(
  token: string,
  userId: string,
): Promise<{ ok: true; groupId: string } | { ok: false; message: string }> {
  const result = await joinByInvite(
    { invites: drizzleInviteRepository, memberships: drizzleMembershipRepository },
    { token, userId },
  )

  if (!result.ok) {
    return { ok: false, message: toVietnameseMessage(result.error.code) }
  }

  return { ok: true, groupId: result.value.groupId }
}
```

Khác `dishes/actions.ts`/`groups/actions.ts` (dùng `useActionState` + `FormData`), action này gọi trực tiếp từ Server Component (`JoinPage`) vì không có form nào — bấm vào link `/join/<token>` chính là "submit". Không cần `'use server'` file riêng nếu muốn, nhưng tách file để nhất quán với các route khác trong repo.

## 12.6 `GroupOverviewScreen` — thêm hàng "Mời thành viên"

Sửa file đã có (`src/features/group/presentation/components/group-overview-screen.tsx`): thay comment `E2-T2 + E5-T1: thêm hai hàng "Thành viên" và "Quy định bữa ăn"` bằng MỘT hàng mới trỏ `/groups/{id}/invite` (chỉ "Mời thành viên"; hàng "Thành viên"/member-list và "Quy định bữa ăn" vẫn để nguyên comment chờ, vì không thuộc slice này). Thêm prop `inviteHref` theo đúng khuôn `dishesHref` đã có.

## 12.7 `GroupListScreen` — bật dòng "Tôi có link mời"

Trước khi code phần này, mở `docs/designs/designs/S-01 S-02 S-03 S-13 Khung vao app.dc.html` và `docs/designs/README.md` phần S-13 để xác nhận vị trí/copy chính xác của lối vào "Tôi có link mời" trên S-02 (danh sách nhóm) — README đã trích ở §2 phần nghiên cứu nhưng chưa xác nhận trực quan. Nếu link chỉ dùng qua URL `/join/<token>` (không cần người dùng tự gõ token thủ công), có thể bỏ qua việc bật dòng này ở S-02 hoàn toàn cho tới khi có bằng chứng từ design rằng cần một ô nhập token thủ công — **đừng đoán UI khi có file design thật để mở**.

---

# 13. Rủi ro

| Rủi ro | Hậu quả | Giảm thiểu |
|---|---|---|
| Test tích hợp §10.1 chỉ chứng minh tuần tự, không chứng minh song song thật | Race hai request ĐỒNG THỜI (không phải liên tiếp) chưa được test trực tiếp | Chấp nhận cho quy mô hộ gia đình; CTE tự nó đúng theo ngữ nghĩa Postgres (UPDATE...WHERE là atomic ở mức row-lock), rủi ro còn lại chỉ là "chưa có bài test đo được", không phải "code sai" |
| Đăng nhập chưa xong khi bấm link mời | `?joinToken=` bị bỏ qua, người dùng phải tự bấm lại link sau khi đăng nhập | Ghi rõ giới hạn ở §12.4; nối lại luồng này là việc của lần sau nếu người dùng thật gặp khó chịu, không nằm trong ước lượng 2h |
| `db.execute(sql\`...\`)` là code chưa có tiền lệ trong repo | Cú pháp CTE có thể không chạy đúng như kỳ vọng trên Postgres/Neon thật | Bắt buộc chạy thử qua `psql`/`db:studio` TRƯỚC khi viết integration test, đã nhắc ở §10 |
| `invite-screen.tsx` dùng `window.location.origin` (client-only) | Nếu component vô tình render phía server sẽ lỗi (`window` undefined) | Component có `'use client'` ở đầu file — bắt buộc giữ nguyên, đừng bỏ trong lúc refactor |

---

# 14. Config changes

| File | Thay đổi |
|---|---|
| `src/shared/db/schema.ts` | + `groupInvites` table, `GroupInvite`/`NewGroupInvite` types |
| `src/shared/db/migrations/0003_group_invites.sql` | Mới |
| `src/shared/db/migrations/meta/_journal.json` | + entry idx 3 |
| `src/shared/testing/factories.ts` | + `TestInvite`/`makeInvite` |
| `src/app/groups/[groupId]/group-access.ts` | + `requireGroupAdminContext` |
| `src/features/group/presentation/components/group-overview-screen.tsx` | + prop `inviteHref`, bật hàng "Mời thành viên" |

## 14.1 `makeInvite` — `src/shared/testing/factories.ts`

```ts
export type TestInvite = {
  id: string
  groupId: string
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
}

export function makeInvite(overrides: Partial<TestInvite> = {}): TestInvite {
  return {
    id: '01920000-0000-7000-8000-0000000000e1',
    groupId: '01920000-0000-7000-8000-0000000000a1',
    tokenHash: 'test-hash',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    usedAt: null,
    ...overrides,
  }
}
```

---

# 15. Thứ tự TDD đề xuất

1. `shared/crypto/invite-token.test.ts` → `invite-token.ts`
2. `features/group/domain/invite.test.ts` → `invite.ts`
3. `shared/testing/factories.ts` + `makeInvite`
4. `features/group/application/invite-repository.ts` (port, không có test — chỉ type)
5. `create-invite.test.ts` → `create-invite.ts`
6. `join-by-invite.test.ts` → `join-by-invite.ts`
7. Schema + migration + `drizzle-invite-repository.ts` + integration test (chạy thử CTE qua `db:studio` trước — §10)
8. `group-access.ts` + `requireGroupAdminContext`
9. UI: `invite-screen.tsx` + test → routes + actions
10. `yarn verify && yarn arch:probe && yarn test:integration`

---

# 16. Test Cases coverage

| TC | Mô tả | Nơi test |
|---|---|---|
| TC-011 | Admin tạo link — token + expiresAt, chỉ hash lưu DB | `create-invite.test.ts` |
| TC-012 | Member tạo link — ERR_NOT_GROUP_ADMIN | `create-invite.test.ts` |
| TC-013 | Token hợp lệ chưa dùng — tạo Member, đánh dấu dùng cùng transaction | `join-by-invite.test.ts` + `drizzle-invite-repository.integration.test.ts` |
| TC-014 | Token đã dùng — ERR_INVITE_ALREADY_USED | `join-by-invite.test.ts` |
| TC-015 | Đã là Member — ERR_ALREADY_GROUP_MEMBER, token vẫn dùng được cho người khác | `join-by-invite.test.ts` |
| TC-016 | Token tạo 8 ngày trước — ERR_INVITE_INVALID | `join-by-invite.test.ts` |
| TC-112 | Hết hạn đúng lúc `expiresAt` (biên đóng) | `invite.test.ts` |

---

# 17. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v1.1.md`

```markdown
# DEC-021 — Invite Consumption Uses a Single Raw-SQL CTE, Not db.batch()

**Date:** 2026-08-18
**Status:** Accepted

## Decision

`joinByInvite`'s atomic step (mark invite token used + create group membership) is
implemented as a single raw SQL statement using a CTE
(`WITH consumed AS (UPDATE ... RETURNING id) INSERT ... SELECT ... FROM consumed`),
executed via `db.execute(sql\`...\`)`, rather than `db.batch([...])`.

## Rationale

`db.batch()` on the neon-http driver is non-interactive: it cannot make the second
statement's execution conditional on the first statement's result within one call.
Here the membership INSERT must only happen if the invite UPDATE actually consumed
an unused token — exactly the "genuine read-then-write" case DEC-018/DEC-020
predicted would eventually require more than batch. A single CTE statement is
atomic by Postgres semantics on its own, without needing `db.transaction()`
(unsupported on neon-http) or the WebSocket driver.

## Consequence

First use of `db.execute(sql\`...\`)` in the codebase — no prior art to follow.
Future genuine read-then-write needs (e.g. E3-T1's Group Rule → Session Rule
snapshot) should consider this same single-statement-CTE pattern before reaching
for the WebSocket driver.

## Affected Documents

- Tech Spec & Architecture (db access pattern notes)
- Master Plan §9 (đường găng — no change to critical path)
```

```markdown
# DEC-022 — Invite Tokens: node:crypto, SHA-256, No Bcrypt

**Date:** 2026-08-18
**Status:** Accepted

## Decision

Invite tokens use `randomBytes(24)` (192-bit) from `node:crypto` for generation
and plain SHA-256 (`createHash('sha256')`) for the stored hash — not bcrypt/argon2.

## Rationale

Bcrypt/argon2 exist to slow down brute-forcing of low-entropy, human-chosen
secrets (passwords). An invite token is machine-generated with ≥192 bits of
entropy — brute-forcing it is infeasible regardless of hash speed. SHA-256 only
serves the "don't store the raw token" requirement (SPEC-003), not a
anti-brute-force requirement.

## Affected Documents

- SDD SPEC-003
```

---

# 18. Master Plan

Sau khi code xong và `yarn verify`/`yarn arch:probe`/`yarn test:integration` xanh, tick E2-T1 và E2-T2 trong `docs/what-we-gonna-eat-today_master-plan_v1_0.md` §4.
