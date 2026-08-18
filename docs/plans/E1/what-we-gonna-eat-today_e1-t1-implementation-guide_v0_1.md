# 🔐 Implementation Guide — E1-T1 / S1: Đăng nhập & Xác thực người dùng

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Completed`
> - **Created:** `2026-08-16` | **Last Updated:** `2026-08-18`
> - **Upstream:** [Master Plan](what-we-gonna-eat-today_master-plan_v1_0.md) (`E1-T1`) • [SDD](what-we-gonna-eat-today_sdd_v0_1.md) (`SPEC-001`) • [Tech Spec](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) • [Test Cases Spec](what-we-gonna-eat-today_test-cases-specification_v0_1.md) (`TC-001→003`)
> - **Scope:** Subtask `E1-T1` — Auth.js Google OAuth, Bảng `users`, Route `/groups`
>
> 📌 *Hướng dẫn kỹ thuật thi công TDD cho subtask E1-T1: Tích hợp Auth.js v5 beta, xác thực Google OAuth, xử lý lỗi tại boundary và cấp phát phiên JWT an toàn.*

---

# 0. Điều kiện xong

Lấy từ Master Plan §3 và Tech Spec §8.3:

- [x] Đăng nhập được trên preview Vercel, mở bằng điện thoại thật
- [x] TC-001, TC-002, TC-003 pass ở tầng A (application unit, mock port)
- [x] `yarn verify` xanh (typecheck → lint → format → dup → knip → test)
- [x] `yarn arch:probe` xanh
- [x] `yarn build` xanh
- [x] PR có link tới SPEC-001

Bảng `users` **đã tồn tại** (`src/shared/db/schema.ts` + `0000_hard_speedball.sql`). **Không có migration mới ở subtask này.**

---

# 1. Quyết định đã chốt

| Việc | Chốt | Vì sao |
| --- | --- | --- |
| Thư viện auth | `next-auth@5.0.0-beta.32`, ghim tuyệt đối, **không dùng adapter** | Tech Spec §1 chốt Auth.js. Adapter của Auth.js đòi schema riêng (`users/accounts/sessions/verificationTokens`), trong khi schema dự án là `provider + provider_subject` (SPEC-001) |
| Session | JWT cookie, `maxAge` 30 ngày | Tech Spec §5 |
| Styling | Tailwind v4 (`tailwindcss` + `@tailwindcss/postcss` `4.3.3`) | Design Handoff ràng buộc số 1 |
| Sau đăng nhập | `/groups` tạm — tên + email + Đăng xuất | S-02 thuộc E1-T2 |
| Bảo vệ route | DAL trong Server Component, **không tạo `src/proxy.ts`** | Docs Next 16 `02-guides/authentication.md`: Proxy chỉ là kiểm tra lạc quan, DAL mới là tuyến phòng thủ. Guard thật là SPEC-019 ở E1-T3 |
| `displayName` rỗng | fallback `= email` | Cột `display_name` là `notNull`, SPEC-001 không nói gì cho trường hợp provider không trả tên |
| Lần đăng nhập sau | **không** đồng bộ lại `email` / `display_name` | SPEC-001 không yêu cầu. Muốn có thì mở decision mới ở E2 |

---

# 2. Bẫy Next 16 (đọc trước khi gõ dòng nào)

`AGENTS.md` bắt buộc đọc `node_modules/next/dist/docs/`. Tám điểm dưới đây là chỗ trí nhớ về Next 14/15 sẽ sai:

1. `middleware` → **`proxy`** (`src/proxy.ts`, hàm tên `proxy`), runtime cố định `nodejs`, không cấu hình được. Guide này **không dùng**.
2. **Request API là async, bản đồng bộ đã bị xoá hẳn**: `cookies()`, `headers()`, `params`, `searchParams`.
3. **Không dùng helper `PageProps<'/'>` / `RouteContext<…>`.** Chúng do `next typegen` sinh vào `.next/types`, mà CI chạy `yarn typecheck` **trước** `yarn build` → trên máy sạch chưa tồn tại → `tsc` đỏ. **Khai kiểu `searchParams` thủ công.**
4. Turbopack là bundler mặc định cho cả `dev` lẫn `build`. PostCSS vẫn đọc `postcss.config.mjs` ở gốc repo — không cần bật cờ experimental nào.
5. `unauthorized()` cần `experimental.authInterrupts`. Guide này dùng `redirect('/')` để khỏi phải sửa `next.config.ts`.
6. `redirect()` hoạt động bằng cách **throw** → phải gọi **ngoài** `try/catch`. Áp dụng luôn cho `signIn()` / `signOut()` của next-auth vì chúng gọi `redirect()` bên trong.
7. `typedRoutes` chỉ type `Link href` và `router.push/replace/prefetch` — **không** type `redirect()` hay `redirectTo`. Nhưng vẫn phải tạo `app/groups/page.tsx` trước khi viết `<Link href="/groups">` bất kỳ.
8. Server Action gọi được bằng POST trực tiếp, không chỉ qua UI → mọi action phải tự kiểm auth bên trong.

---

# 3. Bước 0 — Sửa `src/shared/db/client.ts` trước tiên

**Đây là rủi ro số một của subtask này.** `client.ts` hiện gọi `readDatabaseUrl()` ở module scope. Sau khi có route auth, chuỗi import là:

```
app/api/auth/[...nextauth]/route.ts → infrastructure/auth.ts
  → drizzle-user-repository.ts → shared/db/client.ts
```

`next build` nạp module của route để thu metadata, mà `.github/workflows/ci.yml` **không khai biến môi trường nào** → build đỏ với `Thiếu DATABASE_URL`. Hiện chưa lộ ra vì chưa route nào chạm `client.ts`.

```ts
// src/shared/db/client.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import * as schema from './schema'

/**
 * Driver HTTP của Neon, không giữ kết nối lâu — hợp với môi trường serverless
 * của Vercel, nơi mỗi invocation có thể là một process khác.
 *
 * Đánh đổi: driver HTTP không chạy được transaction nhiều câu lệnh. Từ E1-T7 trở
 * đi có vài chỗ bắt buộc transaction thật (Start Session, finalize + sinh Eating
 * History — TC-107, TC-109). Khi tới đó sẽ cần thêm driver WebSocket
 * (`neon-serverless`) song song, chứ không thay thế cái này.
 *
 * Kết nối được dựng LƯỜI và nhớ lại. Đừng đổi về `export const db = …`: module
 * này nằm trên đường import của Route Handler auth, mà `next build` nạp module
 * route để thu metadata — build trên CI không có DATABASE_URL sẽ đỏ ngay.
 */
function readDatabaseUrl(): string {
  const url = process.env['DATABASE_URL']
  if (!url) {
    throw new Error('Thiếu DATABASE_URL. Xem Setup & Ops Guide §3.')
  }
  return url
}

let cached: ReturnType<typeof createDb> | undefined

function createDb() {
  return drizzle(neon(readDatabaseUrl()), { schema })
}

export function getDb() {
  if (cached === undefined) {
    cached = createDb()
  }
  return cached
}

export type Database = ReturnType<typeof getDb>
```

`drizzle.config.ts` không dùng `client.ts` nên không ảnh hưởng. Entry `"src/shared/db/client.ts!"` trong `knip.jsonc` giữ nguyên.

**Chạy `yarn verify` ngay sau bước này.** Đây là refactor thuần, `tsc` là lưới an toàn.

---

# 4. Cài đặt

```bash
yarn add next-auth@5.0.0-beta.32
yarn add -D tailwindcss@4.3.3 @tailwindcss/postcss@4.3.3
```

Ghim tuyệt đối, không `^` — repo ghim exact version khắp nơi. Kiểm lại `package.json` sau khi cài, yarn có thể tự thêm `^`.

`next-auth@5.0.0-beta.32` khai `peerDependencies`: `next: ^14.0.0-0 || ^15.0.0 || ^16.0.0`, `react: ^18.2.0 || ^19.0.0`, dependency duy nhất là `@auth/core@0.41.3`. Package là ESM có `exports` với nhánh `types` → hợp `moduleResolution: bundler` + `verbatimModuleSyntax`.

---

# 5. Cây file

```
src/
├── shared/
│   ├── result.ts                                    mới
│   ├── errors.ts                                    mới
│   ├── errors.test.ts                               mới
│   ├── testing/factories.ts                         mới
│   ├── ui/button.tsx        + button.test.tsx       mới
│   ├── ui/banner.tsx        + banner.test.tsx       mới
│   └── db/client.ts                                 SỬA (§3)
│
├── features/auth/
│   ├── domain/provider-identity.ts + .test.ts       mới
│   ├── application/user-repository.ts               mới — PORT
│   ├── application/provision-user.ts + .test.ts     mới — TC-001→003
│   ├── infrastructure/drizzle-user-repository.ts    mới
│   ├── infrastructure/auth.ts                       mới
│   ├── infrastructure/session.ts                    mới — DAL
│   ├── presentation/containers/auth-actions.ts      mới — 'use server'
│   ├── presentation/components/login-screen.tsx + .test.tsx    mới
│   └── presentation/components/google-submit-button.tsx        mới — 'use client'
│
└── app/
    ├── layout.tsx                                   SỬA
    ├── globals.css                                  VIẾT LẠI
    ├── page.tsx                                     VIẾT LẠI
    ├── groups/page.tsx                              mới
    └── api/auth/[...nextauth]/route.ts              mới

postcss.config.mjs                                   mới, gốc repo
```

## 5.1 Vì sao đặt ở đó

Đọc `eslint.config.mjs` trước khi cãi. Zone của `import/no-restricted-paths`: **`target` là thư mục bị cấm đi import, `from` là thứ nó không được import.**

- `result.ts` / `errors.ts` ở **`src/shared/`** chứ không ở `features/auth/domain/`: E1-T2 (`createGroup`) và E1-T3 (`assertGroupAccess`) dùng lại ngay. Để trong `auth` thì `group` phải import chéo feature — `CROSS_FEATURE_ZONES` chặn.
- `auth.ts` ở **`features/auth/infrastructure/`** chứ không phải `src/auth.ts`: nó là adapter khung ngoài, và `infrastructure → application` là chiều hợp lệ. Đặt ở gốc `src/` sẽ tạo khái niệm thứ tư ngoài `features | shared | app`, trái Tech Spec §2.1.
- `presentation/containers/` **được phép** import `infrastructure/`. Chỉ `presentation/components/` bị chặn khỏi `application` / `infrastructure` / `shared/db` — đó là lý do `login-screen.tsx` nhận action qua prop.
- `factories.ts` **không** import type từ `features/auth/domain` — `shared/` phụ thuộc ngược vào `features/` là sai kiến trúc dù ESLint chưa chặn. Kiểu khớp về cấu trúc, `tsc` bắt lệch tại chỗ dùng.
- Component dùng chung ở **`src/shared/ui/`**, không phải `src/features/shared/presentation/` như Design Handoff viết — `src/shared/` nằm ngang cấp `src/features/` (Tech Spec §2.1), và `CROSS_FEATURE_ZONES` sẽ chặn mọi feature import `src/features/shared`.

---

# 6. Code

## 6.1 `src/shared/result.ts`

```ts
/**
 * Tech Spec §4.3 — `application/` trả `Result<T, Failure>`, không ném exception
 * qua ranh giới tầng.
 *
 * Đặt ở `shared/` vì mọi feature đều cần. Để trong một feature thì các feature
 * khác phải import chéo, điều `CROSS_FEATURE_ZONES` chặn.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}
```

## 6.2 `src/shared/errors.ts`

```ts
/**
 * SDD §2.5 — bảng mã lỗi. Đây là nguồn sự thật duy nhất; bảng dịch sang thông
 * điệp tiếng Việt là việc của E6-T2 (`shared/errors/messages.ts`).
 *
 * Khai dưới dạng type union chứ không phải mảng `as const`: knip chỉ báo export
 * giá trị không dùng, nên một mảng hằng số sẽ bắt phải nuôi thêm một export chết
 * cho tới khi có đủ use case.
 */
export type ErrorCode =
  | 'ERR_UNAUTHENTICATED'
  | 'ERR_NOT_GROUP_MEMBER'
  | 'ERR_NOT_GROUP_ADMIN'
  | 'ERR_NOT_SESSION_CREATOR'
  | 'ERR_NOT_PARTICIPANT'
  | 'ERR_VALIDATION'
  | 'ERR_INVITE_INVALID'
  | 'ERR_INVITE_ALREADY_USED'
  | 'ERR_ALREADY_GROUP_MEMBER'
  | 'ERR_DISH_ALREADY_IN_POOL'
  | 'ERR_DISH_NOT_IN_POOL'
  | 'ERR_INVALID_SYSTEM_TAG'
  | 'ERR_SESSION_EXISTS_TODAY'
  | 'ERR_SESSION_NOT_DRAFT'
  | 'ERR_SESSION_NOT_ACTIVE'
  | 'ERR_PARTICIPANT_NOT_MEMBER'
  | 'ERR_PARTICIPANT_EXISTS'
  | 'ERR_DUPLICATE_DISH_IN_MEAL'
  | 'ERR_EMPTY_FINAL_MEAL'
  | 'ERR_REQUIRED_RULE_FAILED'
  | 'ERR_DUPLICATE_RULE'
  | 'ERR_INVALID_MINIMUM_COUNT'

export type Failure = {
  readonly code: ErrorCode
  readonly details?: Record<string, unknown>
}

/**
 * `exactOptionalPropertyTypes` cấm gán `details: undefined`, nên phải rẽ nhánh
 * chứ không viết `{ code, details }` một phát.
 */
export function failure(code: ErrorCode, details?: Record<string, unknown>): Failure {
  return details === undefined ? { code } : { code, details }
}
```

`src/shared/errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { failure } from './errors'

describe('failure', () => {
  it('không gắn key `details` khi không truyền — exactOptionalPropertyTypes', () => {
    expect(Object.hasOwn(failure('ERR_VALIDATION'), 'details')).toBe(false)
  })

  it('giữ nguyên details khi có truyền', () => {
    expect(failure('ERR_VALIDATION', { field: 'email' })).toEqual({
      code: 'ERR_VALIDATION',
      details: { field: 'email' },
    })
  })
})
```

## 6.3 `src/features/auth/domain/provider-identity.ts`

Viết **test trước**, xem §6.4.

```ts
/**
 * SPEC-001 — Đăng nhập.
 *
 * Khoá định danh là `provider + provider_subject`, KHÔNG phải email: email đổi
 * được và hai tài khoản provider khác nhau có thể mang cùng email (TC-003).
 *
 * Hàm thuần: không React, không Drizzle, không `process.env`. Mọi thứ cần biết
 * đều đi vào qua tham số, nên test không phải mock gì.
 */

export type ProviderIdentity = {
  readonly provider: string
  readonly providerSubject: string
}

export type ProviderProfile = ProviderIdentity & {
  readonly email: string
  readonly displayName: string
}

/** Hình dạng User sau khi đã đăng nhập. `id` là UUID v7 của bảng `users`. */
export type AuthenticatedUser = {
  readonly id: string
  readonly displayName: string
  readonly email: string
}

/** Dữ liệu thô từ provider — mọi trường đều có thể thiếu hoặc `null`. */
export type RawProviderProfile = {
  readonly provider?: string | null
  readonly providerSubject?: string | null
  readonly email?: string | null
  readonly displayName?: string | null
}

function clean(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

/**
 * Đọc profile thô thành `ProviderProfile`, hoặc `null` nếu thiếu thứ bắt buộc.
 *
 * `displayName` rỗng thì dùng email: cột `display_name` là `notNull`, và chặn
 * đăng nhập chỉ vì provider không trả tên là phản ứng nặng tay hơn vấn đề.
 */
export function readProviderProfile(raw: RawProviderProfile): ProviderProfile | null {
  const provider = clean(raw.provider)
  const providerSubject = clean(raw.providerSubject)
  const email = clean(raw.email).toLowerCase()

  if (provider === '' || providerSubject === '' || email === '') {
    return null
  }

  const displayName = clean(raw.displayName)

  return {
    provider,
    providerSubject,
    email,
    displayName: displayName === '' ? email : displayName,
  }
}
```

## 6.4 `src/features/auth/domain/provider-identity.test.ts` — viết TRƯỚC §6.3

```ts
import { describe, expect, it } from 'vitest'

import { readProviderProfile } from './provider-identity'

describe('readProviderProfile', () => {
  it('đọc được profile đủ trường', () => {
    expect(
      readProviderProfile({
        provider: 'google',
        providerSubject: '110000000000000000001',
        email: 'me@example.com',
        displayName: 'Mẹ',
      }),
    ).toEqual({
      provider: 'google',
      providerSubject: '110000000000000000001',
      email: 'me@example.com',
      displayName: 'Mẹ',
    })
  })

  it('trả null khi thiếu provider_subject — khoá định danh không đủ', () => {
    expect(
      readProviderProfile({ provider: 'google', email: 'me@example.com', displayName: 'Mẹ' }),
    ).toBeNull()
  })

  it('trả null khi provider chỉ toàn khoảng trắng', () => {
    expect(
      readProviderProfile({
        provider: '   ',
        providerSubject: '1',
        email: 'me@example.com',
        displayName: 'Mẹ',
      }),
    ).toBeNull()
  })

  it('trả null khi thiếu email', () => {
    expect(readProviderProfile({ provider: 'google', providerSubject: '1' })).toBeNull()
  })

  it('chuẩn hoá email: cắt khoảng trắng và hạ về chữ thường', () => {
    const profile = readProviderProfile({
      provider: 'google',
      providerSubject: '1',
      email: '  Me@Example.COM ',
      displayName: 'Mẹ',
    })

    expect(profile?.email).toBe('me@example.com')
  })

  it('dùng email làm display_name khi provider không trả tên', () => {
    const profile = readProviderProfile({
      provider: 'google',
      providerSubject: '1',
      email: 'me@example.com',
      displayName: null,
    })

    expect(profile?.displayName).toBe('me@example.com')
  })
})
```

## 6.5 `src/features/auth/application/user-repository.ts` — PORT

```ts
import type {
  AuthenticatedUser,
  ProviderIdentity,
  ProviderProfile,
} from '../domain/provider-identity'

/**
 * Tech Spec §2.2 — `application/` định nghĩa port, `infrastructure/` hiện thực.
 * Test tầng A (TC-001→003) mock cổng này bằng object thuần.
 */
export interface UserRepository {
  findByProviderIdentity(identity: ProviderIdentity): Promise<AuthenticatedUser | null>

  /**
   * Idempotent theo `(provider, provider_subject)`: gọi lại với cùng khoá phải
   * trả về đúng bản ghi cũ, không tạo bản trùng và không để unique violation
   * nổi ra ngoài. Đây là nơi race giữa hai lần đăng nhập đầu tiên được xử lý.
   */
  createFromProvider(profile: ProviderProfile): Promise<AuthenticatedUser>
}
```

## 6.6 `src/features/auth/application/provision-user.ts`

```ts
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { AuthenticatedUser, RawProviderProfile } from '../domain/provider-identity'
import { readProviderProfile } from '../domain/provider-identity'
import type { UserRepository } from './user-repository'

export type ProvisionUserDeps = {
  readonly users: UserRepository
}

/**
 * SPEC-001 — tìm hoặc tạo User từ profile của provider.
 *
 * Cố ý KHÔNG cập nhật `email` / `display_name` ở những lần đăng nhập sau:
 * SPEC-001 không yêu cầu, và đồng bộ lại là một quyết định riêng có hệ quả với
 * dữ liệu đã có. Nếu muốn, mở decision mới chứ đừng lặng lẽ thêm vào đây.
 *
 * Không `try/catch` quanh port: lỗi hạ tầng để nổi lên cho tầng ngoài xử lý,
 * bảng mã lỗi SDD §2.5 không có mã nào cho "lỗi không xác định".
 */
export async function provisionUser(
  deps: ProvisionUserDeps,
  raw: RawProviderProfile,
): Promise<Result<AuthenticatedUser, Failure>> {
  const profile = readProviderProfile(raw)

  if (profile === null) {
    return err(
      failure('ERR_VALIDATION', {
        reason: 'provider, provider_subject hoặc email thiếu trong callback',
      }),
    )
  }

  const existing = await deps.users.findByProviderIdentity({
    provider: profile.provider,
    providerSubject: profile.providerSubject,
  })

  if (existing !== null) {
    return ok(existing)
  }

  return ok(await deps.users.createFromProvider(profile))
}
```

## 6.7 `src/features/auth/application/provision-user.test.ts` — viết TRƯỚC §6.6

**Đây là acceptance của E1-T1.** Fake port là object thuần, không auto-mock lib (Test Cases §1.3).

```ts
import { describe, expect, it } from 'vitest'

import { makeUser } from '@/shared/testing/factories'

import type { UserRepository } from './user-repository'
import { provisionUser } from './provision-user'

/**
 * Cổng giả: một mảng trong bộ nhớ cư xử đúng như hợp đồng của `UserRepository`
 * — khoá là `(provider, provider_subject)`, KHÔNG phải email. Đếm số lần gọi
 * `createFromProvider` để TC-002 kiểm được "không tạo User mới".
 */
function makeFakeUserRepository(seed: ReadonlyArray<Row> = []) {
  type Row = ReturnType<typeof makeUser> & { provider: string; providerSubject: string }

  const rows: Row[] = [...seed]
  let createCalls = 0

  const repository: UserRepository = {
    async findByProviderIdentity(identity) {
      const found = rows.find(
        (row) =>
          row.provider === identity.provider && row.providerSubject === identity.providerSubject,
      )
      return found === undefined ? null : { id: found.id, displayName: found.displayName, email: found.email }
    },

    async createFromProvider(profile) {
      createCalls += 1
      const row: Row = {
        ...makeUser({ id: `user-${rows.length + 1}`, displayName: profile.displayName, email: profile.email }),
        provider: profile.provider,
        providerSubject: profile.providerSubject,
      }
      rows.push(row)
      return { id: row.id, displayName: row.displayName, email: row.email }
    },
  }

  return {
    repository,
    rows,
    get createCalls() {
      return createCalls
    },
  }
}

describe('SPEC-001 — Đăng nhập', () => {
  // Nửa "trả cookie phiên" của TC-001 do @auth/core lo (nó mã hoá token sau khi
  // callbacks.jwt trả về khác null). Tầng A không kiểm cookie được — bằng chứng
  // nằm ở smoke test thủ công, Implementation Guide §8.2 bước 7. Ghi ra để lỗ
  // hổng nhìn thấy được thay vì giả vờ đã phủ.

  it('TC-001: chưa có User nào, callback OAuth hợp lệ thì tạo đúng một User', async () => {
    const fake = makeFakeUserRepository()

    const result = await provisionUser(
      { users: fake.repository },
      {
        provider: 'google',
        providerSubject: '110000000000000000001',
        email: 'me@example.com',
        displayName: 'Mẹ',
      },
    )

    expect(result.ok).toBe(true)
    expect(fake.rows).toHaveLength(1)
    expect(fake.createCalls).toBe(1)
    expect(fake.rows[0]?.email).toBe('me@example.com')
  })

  it('TC-002: đã có User với provider_subject X, callback lại với X thì không tạo User mới', async () => {
    const fake = makeFakeUserRepository()
    const raw = {
      provider: 'google',
      providerSubject: '110000000000000000001',
      email: 'me@example.com',
      displayName: 'Mẹ',
    }

    const first = await provisionUser({ users: fake.repository }, raw)
    const createCallsAfterFirst = fake.createCalls

    const second = await provisionUser({ users: fake.repository }, raw)

    expect(fake.rows).toHaveLength(1)
    expect(fake.createCalls).toBe(createCallsAfterFirst)
    expect(first.ok && second.ok && first.value.id === second.value.id).toBe(true)
  })

  it('TC-003: hai provider account cùng email vẫn là hai User riêng biệt', async () => {
    const fake = makeFakeUserRepository()

    const first = await provisionUser(
      { users: fake.repository },
      { provider: 'google', providerSubject: 'SUBJECT-A', email: 'chung@example.com', displayName: 'Bố' },
    )
    const second = await provisionUser(
      { users: fake.repository },
      { provider: 'google', providerSubject: 'SUBJECT-B', email: 'chung@example.com', displayName: 'Mẹ' },
    )

    expect(fake.rows).toHaveLength(2)
    expect(first.ok && second.ok && first.value.id !== second.value.id).toBe(true)
  })

  it('TC-001b: thiếu provider_subject thì trả ERR_VALIDATION và không đụng tới repository', async () => {
    const fake = makeFakeUserRepository()

    const result = await provisionUser(
      { users: fake.repository },
      { provider: 'google', email: 'me@example.com', displayName: 'Mẹ' },
    )

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error.code).toBe('ERR_VALIDATION')
    expect(fake.rows).toHaveLength(0)
  })
})
```

> Nếu `tsc` phàn nàn vì `type Row` khai sau chỗ dùng trong signature, đưa `type Row` ra ngoài hàm `makeFakeUserRepository`. Type alias không hoisted qua ranh giới tham số.

## 6.8 `src/shared/testing/factories.ts`

```ts
/**
 * Test Cases §1.3 — factory dữ liệu test gom về một chỗ.
 *
 * Cố ý KHÔNG import type từ `features/*`: `shared/` phụ thuộc ngược vào
 * `features/` là sai chiều kiến trúc. Kiểu khớp về cấu trúc, và `tsc` bắt được
 * ngay tại chỗ dùng nếu hai bên lệch nhau.
 */
export type TestUser = {
  id: string
  displayName: string
  email: string
}

export function makeUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: '01920000-0000-7000-8000-000000000001',
    displayName: 'Mẹ',
    email: 'me@example.com',
    ...overrides,
  }
}
```

## 6.9 `src/features/auth/infrastructure/drizzle-user-repository.ts`

```ts
import { and, eq } from 'drizzle-orm'

import { getDb } from '@/shared/db/client'
import { users } from '@/shared/db/schema'

import type { UserRepository } from '../application/user-repository'
import type {
  AuthenticatedUser,
  ProviderIdentity,
  ProviderProfile,
} from '../domain/provider-identity'

/** Chỉ ba cột này rời khỏi infrastructure — SDD §2.3 cấm rò rỉ row ORM ra ngoài. */
const RETURNED_COLUMNS = {
  id: users.id,
  displayName: users.displayName,
  email: users.email,
}

async function findByProviderIdentity(
  identity: ProviderIdentity,
): Promise<AuthenticatedUser | null> {
  const rows = await getDb()
    .select(RETURNED_COLUMNS)
    .from(users)
    .where(
      and(
        eq(users.provider, identity.provider),
        eq(users.providerSubject, identity.providerSubject),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

/**
 * `onConflictDoNothing` trên unique index `(provider, provider_subject)`: hai
 * request đầu tiên của cùng một người chạy song song thì một cái insert được,
 * cái kia nhận mảng rỗng rồi đọc lại — không có bên nào thấy unique violation.
 *
 * `id` do `$defaultFn(() => uuidv7())` trong schema sinh, không truyền vào đây.
 */
async function createFromProvider(profile: ProviderProfile): Promise<AuthenticatedUser> {
  const inserted = await getDb()
    .insert(users)
    .values({
      provider: profile.provider,
      providerSubject: profile.providerSubject,
      email: profile.email,
      displayName: profile.displayName,
    })
    .onConflictDoNothing({ target: [users.provider, users.providerSubject] })
    .returning(RETURNED_COLUMNS)

  const created = inserted[0]
  if (created !== undefined) {
    return created
  }

  const existing = await findByProviderIdentity(profile)
  if (existing === null) {
    throw new Error('SPEC-001: insert bị bỏ qua nhưng không tìm thấy User tương ứng')
  }
  return existing
}

export const drizzleUserRepository: UserRepository = {
  findByProviderIdentity,
  createFromProvider,
}
```

## 6.10 `src/features/auth/infrastructure/auth.ts`

```ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

import { provisionUser } from '../application/provision-user'
import { drizzleUserRepository } from './drizzle-user-repository'

/**
 * Tech Spec §5 — Auth.js, chỉ Google, session là cookie JWT hạn 30 ngày.
 *
 * Không dùng adapter database: schema `users` của dự án lấy khoá định danh là
 * `provider + provider_subject` (SPEC-001), không khớp bộ bảng mà adapter của
 * Auth.js yêu cầu. Việc tìm-hoặc-tạo User nằm ở `application/provisionUser`.
 */
declare module 'next-auth' {
  interface Session {
    userId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
  }
}

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Truyền chính hàm provider, không gọi nó: @auth/core cần điều đó để tự đọc
  // AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET từ môi trường.
  providers: [Google],

  session: { strategy: 'jwt', maxAge: THIRTY_DAYS_IN_SECONDS },

  // S-01 vừa là trang đăng nhập vừa là nơi hiện lỗi xác thực.
  pages: { signIn: '/', error: '/' },

  callbacks: {
    async jwt({ token, account, profile }) {
      // `account` chỉ khác null ở đúng lượt callback OAuth. Mọi request thường
      // đi qua đây mà không chạm database.
      if (account === null || account === undefined) {
        return token
      }

      const result = await provisionUser(
        { users: drizzleUserRepository },
        {
          provider: account.provider,
          // providerAccountId chính là `sub` của Google. KHÔNG dùng `user.id`:
          // @auth/core sinh nó bằng crypto.randomUUID() và nó vô nghĩa.
          providerSubject: account.providerAccountId,
          email: profile?.email ?? null,
          displayName: profile?.name ?? null,
        },
      )

      // Phải THROW, không được `return null`. @auth/core hiểu `null` là "xoá
      // cookie rồi vẫn redirect về callbackUrl" — người dùng rơi vào vòng lặp
      // đăng nhập mà không thấy lỗi nào. Đây là chỗ DUY NHẤT trong codebase
      // biến một `Failure` thành exception, và nó nằm ở ranh giới khung ngoài
      // chứ không phải ranh giới tầng: `application/` vẫn trả `Result`.
      if (!result.ok) {
        throw new Error(`SPEC-001 provisionUser thất bại: ${result.error.code}`)
      }

      token.userId = result.value.id
      token.name = result.value.displayName
      token.email = result.value.email

      return token
    },

    session({ session, token }) {
      if (typeof token.userId === 'string') {
        session.userId = token.userId
      }
      return session
    },
  },
})
```

**Nếu `tsc` không chịu module augmentation** (`Property 'userId' does not exist on type 'Session'`): `next-auth` chỉ re-export interface của `@auth/core`, nên augment có thể không merge. Hai lối thoát, thử theo thứ tự:

1. Đổi `declare module 'next-auth'` → `declare module '@auth/core/types'` và `'next-auth/jwt'` → `'@auth/core/jwt'`.
2. Bỏ hẳn augmentation, đọc bằng type guard: `const id = token['userId']; if (typeof id === 'string') { … }`. Cách này không phụ thuộc gì, chỉ xấu hơn.

## 6.11 `src/features/auth/infrastructure/session.ts` — DAL

```ts
import { cache } from 'react'

import type { AuthenticatedUser } from '../domain/provider-identity'
import { auth } from './auth'

/**
 * Data Access Layer theo khuyến nghị của Next 16 (`02-guides/authentication.md`):
 * mọi chỗ cần biết "ai đang đăng nhập" đi qua đúng hàm này.
 *
 * KHÔNG truy vấn database — mọi thứ cần thiết đã nằm trong JWT. Nếu đọc DB ở
 * đây thì mỗi lần điều hướng đều dính cold start của Neon (R-01, NFR-01).
 *
 * `cache()` của React khử trùng lặp trong một lần render.
 */
export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const session = await auth()

  const id = session?.userId
  if (typeof id !== 'string' || id === '') {
    return null
  }

  return {
    id,
    displayName: session?.user?.name ?? '',
    email: session?.user?.email ?? '',
  }
})
```

## 6.12 `src/features/auth/presentation/containers/auth-actions.ts`

```ts
'use server'

import { signIn, signOut } from '../../infrastructure/auth'

/**
 * Cả hai hàm kết thúc bằng `redirect()` bên trong next-auth, mà `redirect()`
 * hoạt động bằng cách throw — tuyệt đối không bọc `try/catch` quanh chúng.
 */
export async function signInWithGoogle(): Promise<void> {
  await signIn('google', { redirectTo: '/groups' })
}

export async function signOutFromApp(): Promise<void> {
  await signOut({ redirectTo: '/' })
}
```

## 6.13 `src/app/api/auth/[...nextauth]/route.ts`

```ts
import { handlers } from '@/features/auth/infrastructure/auth'

export const { GET, POST } = handlers
```

Đường dẫn callback sinh ra từ file này là `/api/auth/callback/google` — đúng ba URI đã ghi ở Setup & Ops Guide §3.

---

# 7. Nền design

## 7.1 `postcss.config.mjs` (gốc repo, mới)

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

ESLint đã có ngoại lệ `import/no-anonymous-default-export` cho `*.config.mjs` — không phải sửa gì.

## 7.2 `src/app/globals.css` — viết lại toàn bộ

Preflight của Tailwind đã lo `box-sizing`, `margin: 0`, `-webkit-text-size-adjust` nên 19 dòng reset hiện tại xoá được.

**Chú ý:** cố ý **không** đặt `--text-*--font-weight` trong `@theme`. Nếu đặt, mỗi lần cần weight khác mặc định (banner là 15/22/**500**, không phải `body` 400) sẽ phải trông chờ vào thứ tự CSS giữa utility `text-*` và `font-*` — thứ không có gì bảo đảm. Luôn viết weight tường minh: `font-normal` / `font-medium` / `font-semibold` / `font-bold`.

```css
@import 'tailwindcss';

/* Design Handoff `docs/designs/README.md` §Design Tokens. Không hardcode hex
   trong component — mọi màu đi qua đây. Chỉ light mode ở v1.0; token đặt tên
   theo vai trò để thêm dark mode sau mà không phải sửa component. */
@theme {
  --color-surface: #fbf8f4;
  --color-surface-raised: #ffffff;
  --color-surface-sunken: #f3eee7;

  --color-ink: #1c1917;
  --color-ink-muted: #6b6259;
  --color-ink-faint: #9c9187; /* CHỈ placeholder và disabled */

  --color-border: #e7e0d6;
  --color-border-strong: #d2c7b8;

  /* Màu nhấn duy nhất */
  --color-accent: #b4531f;
  --color-accent-hover: #9a4419;
  --color-accent-active: #8c3e17;
  --color-accent-soft: #fbede4;
  --color-on-accent: #ffffff;

  /* Ngữ nghĩa vuốt — `no` TRUNG TÍNH, không bao giờ đỏ */
  --color-yes: #3f6b3f;
  --color-yes-hover: #365b36;
  --color-yes-soft: #e9f0e7;
  --color-no: #7a6a5c;
  --color-no-soft: #efeae4;

  --color-warning: #8a6a18;
  --color-warning-soft: #fbf3dc;
  --color-danger: #a3261c; /* CHỈ lỗi thật */
  --color-danger-soft: #fbe9e7;

  /* Thang chữ. Line-height rộng hơn thông thường ở mọi cấp — bắt buộc, do dấu
     tiếng Việt nằm cả trên lẫn dưới. Weight viết tường minh tại chỗ dùng. */
  --text-hero: 34px;
  --text-hero--line-height: 42px;
  --text-display: 28px;
  --text-display--line-height: 34px;
  --text-title: 22px;
  --text-title--line-height: 28px;
  --text-subtitle: 17px;
  --text-subtitle--line-height: 24px;
  --text-body-lg: 17px;
  --text-body-lg--line-height: 26px;
  --text-body: 15px;
  --text-body--line-height: 22px;
  --text-caption: 13px;
  --text-caption--line-height: 18px;

  --tracking-eyebrow: 0.08em;

  --radius-chip: 8px; /* chip, input */
  --radius-control: 12px; /* nút, hàng danh sách */
  --radius-card: 20px; /* thẻ món, sheet */

  --spacing-hairline: 3px; /* thanh dọc của Banner */

  --shadow-button: 0 1px 2px rgba(28, 25, 23, 0.06);
  --shadow-card: 0 1px 2px rgba(28, 25, 23, 0.06), 0 4px 12px rgba(28, 25, 23, 0.05);
  --shadow-lift: 0 2px 4px rgba(28, 25, 23, 0.08), 0 12px 28px rgba(28, 25, 23, 0.1);

  --container-app: 35rem; /* 560px — nội dung căn giữa ở ≥768px */
}

/* `inline` là bắt buộc khi trỏ tới biến do next/font sinh: giá trị được nội suy
   thay vì để var() lồng var() rồi hỏng cascade. */
@theme inline {
  --font-sans: var(--font-be-vietnam-pro), Inter, system-ui, sans-serif;
}

@layer base {
  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
}
```

Thang khoảng cách mặc định của Tailwind (`--spacing: 0.25rem`) khớp 100% với thang 4px của design: `px-6`=24, `pt-8`/`pb-8`=32, `gap-4`=16, `gap-3`=12, `p-3`=12, `gap-2`=8.

Utility sinh ra: `bg-surface`, `text-ink-muted`, `text-hero`, `tracking-eyebrow`, `rounded-control`, `shadow-button`, `w-hairline`, `max-w-app`.

## 7.3 `src/app/layout.tsx`

```tsx
import type { Metadata, Viewport } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import type { ReactNode } from 'react'

import './globals.css'

// Be Vietnam Pro là bắt buộc, không phải sở thích: tên món tiếng Việt có dấu
// chồng (ế, ộ, ữ, ằ) mà nhiều font làm hỏng. Subset `vietnamese` là phần đắt
// giá nhất ở đây.
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam-pro',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Hôm nay ăn gì',
  description: 'Chốt bữa cho cả nhà mà không phải hỏi vòng quanh',
}

// Thiết bị chính là điện thoại (Design Criteria). Khoá zoom là chống tiếp cận,
// nên chỉ đặt viewport-fit, không đặt maximumScale.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body className="min-h-dvh bg-surface font-sans text-ink antialiased">{children}</body>
    </html>
  )
}
```

## 7.4 `src/shared/ui/button.tsx`

```tsx
import type { ButtonHTMLAttributes, ReactElement } from 'react'

type ButtonVariant = 'primary' | 'secondary'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  /** Đang xử lý: giảm tương phản, khoá tương tác, KHÔNG đổi kích thước. */
  pending?: boolean
}

/**
 * Design Handoff §Component library.
 *
 * `quiet` và `danger` chưa có ở đây: chưa màn hình nào ở S1 dùng tới, và một
 * variant không ai gọi là mã chết mà knip phải canh. Thêm khi có chỗ dùng thật.
 */
const BASE_CLASSES =
  'w-full min-h-14 rounded-control px-6 text-subtitle font-semibold transition-transform duration-100 active:scale-[0.98] disabled:active:scale-100'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent shadow-button hover:bg-accent-hover active:bg-accent-active',
  secondary:
    'border border-border bg-surface-raised text-ink hover:border-border-strong hover:bg-surface active:bg-surface-sunken',
}

// Design Criteria: "Nút không được đổi kích thước khi chuyển sang trạng thái
// đang xử lý." Chỉ màu đổi.
const PENDING_CLASSES = 'bg-surface-sunken text-ink-muted'

export function Button({
  variant = 'primary',
  pending = false,
  className = '',
  children,
  ...rest
}: ButtonProps): ReactElement {
  return (
    <button
      {...rest}
      disabled={pending || rest.disabled === true}
      aria-busy={pending}
      className={`${BASE_CLASSES} ${pending ? PENDING_CLASSES : VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
```

`src/shared/ui/button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from './button'

describe('Button', () => {
  it('hiện nhãn được truyền vào', () => {
    render(<Button>Tiếp tục với Google</Button>)
    expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toBeInTheDocument()
  })

  it('pending thì khoá nút và báo aria-busy', () => {
    render(<Button pending>Đang mở Google…</Button>)
    const button = screen.getByRole('button', { name: 'Đang mở Google…' })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('không pending thì không khoá', () => {
    render(<Button>Tiếp tục với Google</Button>)
    expect(screen.getByRole('button')).toBeEnabled()
  })

  it('render được variant secondary', () => {
    render(<Button variant="secondary">Đăng xuất</Button>)
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument()
  })
})
```

## 7.5 `src/shared/ui/banner.tsx`

```tsx
import type { ReactElement, ReactNode } from 'react'

type BannerTone = 'danger' | 'warning'

export type BannerProps = {
  tone: BannerTone
  children: ReactNode
}

/**
 * Design Handoff §Component library — một dải: thanh dọc 3px màu ngữ nghĩa,
 * nền `*-soft`, chữ `--ink`. Không dialog: lỗi nằm cạnh thứ gây ra lỗi.
 */
const TONE_CLASSES: Record<BannerTone, { background: string; bar: string }> = {
  danger: { background: 'bg-danger-soft', bar: 'bg-danger' },
  warning: { background: 'bg-warning-soft', bar: 'bg-warning' },
}

export function Banner({ tone, children }: BannerProps): ReactElement {
  const classes = TONE_CLASSES[tone]

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-control p-3 ${classes.background}`}
    >
      <span aria-hidden className={`w-hairline self-stretch rounded-full ${classes.bar}`} />
      <span className="text-pretty text-body font-medium text-ink">{children}</span>
    </div>
  )
}
```

`src/shared/ui/banner.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Banner } from './banner'

describe('Banner', () => {
  it('tone danger thì có role alert và hiện đúng câu', () => {
    render(<Banner tone="danger">Không đăng nhập được. Thử lại giúp mình.</Banner>)
    expect(screen.getByRole('alert')).toHaveTextContent('Không đăng nhập được. Thử lại giúp mình.')
  })

  it('tone warning thì là status chứ không phải alert', () => {
    render(<Banner tone="warning">Bữa nay chưa có món canh.</Banner>)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
```

## 7.6 `src/features/auth/presentation/components/google-submit-button.tsx`

```tsx
'use client'

import type { ReactElement } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/shared/ui/button'

/**
 * Nhãn và màu đổi theo trạng thái submit của form bao ngoài. Kích thước không
 * đổi — Design Criteria cấm nút co giãn khi đang xử lý.
 */
export function GoogleSubmitButton(): ReactElement {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" pending={pending}>
      {pending ? 'Đang mở Google…' : 'Tiếp tục với Google'}
    </Button>
  )
}
```

Ký tự `…` là ellipsis đơn U+2026, không phải ba dấu chấm.

## 7.7 `src/features/auth/presentation/components/login-screen.tsx`

```tsx
import type { ReactElement } from 'react'

import { Banner } from '@/shared/ui/banner'

import { GoogleSubmitButton } from './google-submit-button'

export type LoginScreenProps = {
  hasError: boolean
  /** Server Action. Component này nằm ở `components/` nên không được tự gọi
   *  use case — nó chỉ nhận hành động qua props. */
  signInAction: () => Promise<void>
}

/**
 * S-01 Đăng nhập. Giá trị lấy từ `docs/designs/designs/S-01 S-02 S-03 S-13 Khung
 * vao app.dc.html` dòng 35–51 — màu, cỡ chữ, khoảng cách và copy tiếng Việt đều
 * là giá trị cuối, không phải gợi ý.
 *
 * Thao tác chính nằm ở nửa dưới màn hình (NFR-03).
 */
export function LoginScreen({ hasError, signInAction }: LoginScreenProps): ReactElement {
  return (
    <main className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-app flex-1 flex-col justify-center gap-4 px-6 pt-8">
        <span className="text-caption font-medium uppercase tracking-eyebrow text-accent">
          Bữa cơm nhà
        </span>
        <h1 className="text-pretty text-hero font-bold text-ink">Hôm nay nhà mình ăn gì</h1>
        <p className="text-pretty text-body-lg font-normal text-ink-muted">
          Cả nhà vuốt qua vài món trong 30 giây. Người nấu chốt. Xong.
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-app flex-col gap-3 px-6 pb-8 pt-8">
        {hasError ? <Banner tone="danger">Không đăng nhập được. Thử lại giúp mình.</Banner> : null}

        <form action={signInAction}>
          <GoogleSubmitButton />
        </form>

        <span className="self-center text-pretty text-center text-caption font-medium text-ink-muted">
          Chỉ dùng để nhận diện bạn trong nhóm gia đình
        </span>
      </div>
    </main>
  )
}
```

`src/features/auth/presentation/components/login-screen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LoginScreen } from './login-screen'

async function noop(): Promise<void> {}

describe('SPEC-001 — Đăng nhập (S-01)', () => {
  it('trạng thái mặc định hiện đủ tiêu đề, nút và dòng trấn an', () => {
    render(<LoginScreen hasError={false} signInAction={noop} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hôm nay nhà mình ăn gì')
    expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toBeInTheDocument()
    expect(screen.getByText('Chỉ dùng để nhận diện bạn trong nhóm gia đình')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('trạng thái lỗi hiện banner và VẪN còn nút để thử lại', () => {
    render(<LoginScreen hasError signInAction={noop} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Không đăng nhập được. Thử lại giúp mình.')
    expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toBeInTheDocument()
  })
})
```

> Trạng thái "đang chuyển hướng" được kiểm ở `button.test.tsx` qua prop `pending`, vì `useFormStatus` chỉ đổi giá trị khi form thực sự submit — dựng lại việc đó trong jsdom tốn hơn giá trị nó mang lại.

## 7.8 `src/app/page.tsx` — viết lại

```tsx
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { LoginScreen } from '@/features/auth/presentation/components/login-screen'
import { signInWithGoogle } from '@/features/auth/presentation/containers/auth-actions'

// Kiểu khai thủ công, KHÔNG dùng helper `PageProps` — helper đó do `next typegen`
// sinh vào `.next/types`, mà CI chạy `yarn typecheck` trước `yarn build`.
type HomePageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const user = await getCurrentUser()
  if (user !== null) {
    redirect('/groups')
  }

  // Auth.js đẩy về `pages.error` kèm `?error=…` khi callback OAuth hỏng.
  const { error } = await searchParams

  return <LoginScreen hasError={error !== undefined} signInAction={signInWithGoogle} />
}
```

## 7.9 `src/app/groups/page.tsx` — tạm

```tsx
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { signOutFromApp } from '@/features/auth/presentation/containers/auth-actions'
import { Button } from '@/shared/ui/button'

// TẠM. E1-T2 thay ruột bằng S-02 Danh sách nhóm. Ở đây chỉ đủ để chứng minh
// cookie phiên chạy thật trên preview — điều kiện "xong" của E1-T1.
export default async function GroupsPage() {
  const user = await getCurrentUser()
  if (user === null) {
    redirect('/')
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col justify-between px-6 pb-8 pt-8">
      <div className="flex flex-col gap-2">
        <span className="text-caption font-medium uppercase tracking-eyebrow text-accent">
          Đã đăng nhập
        </span>
        <h1 className="text-title font-semibold text-ink">{user.displayName}</h1>
        <p className="text-body font-normal text-ink-muted">{user.email}</p>
      </div>

      <form action={signOutFromApp}>
        <Button variant="secondary" type="submit">
          Đăng xuất
        </Button>
      </form>
    </main>
  )
}
```

---

# 8. Cấu hình phải sửa

| File | Sửa gì |
| --- | --- |
| `package.json` | deps += `"next-auth": "5.0.0-beta.32"`; devDeps += `"tailwindcss": "4.3.3"`, `"@tailwindcss/postcss": "4.3.3"`. **Bỏ `^` nếu yarn tự thêm.** |
| `postcss.config.mjs` | tạo mới (§7.1) |
| `knip.jsonc` | `ignore` += `"src/shared/testing/**"` |
| `src/shared/db/client.ts` | `getDb()` lười (§3) |
| `.env.example` | sửa comment `AUTH_URL` (bên dưới) |
| `docs/..._setup-and-ops-guide_v0_1.md` §1 | điền bảng 🔒 |
| `docs/..._setup-and-ops-guide_v0_1.md` §3 | thêm ghi chú AUTH_URL trên preview |
| `docs/..._decision-log_v1.1.md` | thêm một mục (bên dưới) |
| `docs/..._master-plan_v1_0.md` | tick E1-T1 khi xong |

**Không sửa**: `eslint.config.mjs`, `vitest.config.mts` (`coverage.include` đã có `application/**`), `next.config.ts`, `.prettierignore`, `.jscpd.json`, `.github/workflows/ci.yml`.

Chỉ thêm `"postcss.config.mjs"` vào knip `entry` **nếu** `yarn knip` thực sự báo — plugin postcss của knip nhiều khả năng đã nhận ra nó.

## 8.1 `knip.jsonc`

```jsonc
  "ignore": [
    "src/shared/db/migrations/**",
    "docs/**",
    "src/tests/**",

    // Cùng lý do với `src/tests/**`: `--production` không tính test là nơi sử
    // dụng, nên factory dữ liệu test luôn trông như mồ côi.
    "src/shared/testing/**",

    // GỠ Ở E1-T4. …giữ nguyên comment cũ
    "src/features/session/domain/decision-date.ts"
  ],
```

## 8.2 `.env.example` — sửa khối `AUTH_URL`

```bash
# URL gốc của môi trường đang chạy. CHỈ đặt ở local.
#
# Trên Vercel để TRỐNG: biến này ghi đè origin của mọi request, nên đặt giá trị
# production vào scope Preview sẽ làm callback trên preview trỏ nhầm domain.
# Vercel tự đặt VERCEL=1, và next-auth đọc nó để bật trustHost.
AUTH_URL="http://localhost:3000"
```

## 8.3 Setup & Ops Guide §1 — điền bảng 🔒

| Thành phần | Phiên bản ghim |
| --- | --- |
| Next.js | 16.3.1 |
| React | 19.2.8 |
| TypeScript | 6.0.3 |
| Drizzle ORM / Kit | 0.45.2 / 0.31.10 |
| Auth.js | `next-auth@5.0.0-beta.32` (kéo theo `@auth/core@0.41.3`) |
| Tailwind CSS | 4.3.3 |
| Vitest | 4.1.10 |

## 8.4 Decision log — thêm một mục

Nội dung cần ghi: (a) phụ thuộc `next-auth` bản **beta** vì đó là dòng duy nhất hỗ trợ Next 16 + React 19, điều kiện xem lại là khi có bản stable; (b) lý do `callbacks.jwt` **throw** thay vì `return null`, kèm hệ quả nếu ai đó "sửa lại cho đúng quy ước".

---

# 9. Thứ tự thực hiện (TDD)

Nhánh `feat/auth-google-signin`. Conventional Commits, scope `auth` / `shared` / `ui` / `db`. PR link SPEC-001.

| # | Việc | Test viết trước |
| --- | --- | --- |
| 0 | `yarn verify` xanh → refactor `client.ts` (§3) → `yarn verify` lại | — (refactor thuần, `tsc` là lưới) |
| 1 | `shared/result.ts`, `shared/errors.ts` | `errors.test.ts` (§6.2) |
| 2 | `domain/provider-identity.ts` | **`provider-identity.test.ts` (§6.4) — chạy phải ĐỎ trước** |
| 3 | `application/user-repository.ts` + `provision-user.ts`, `shared/testing/factories.ts` | **`provision-user.test.ts` (§6.7) — ĐỎ trước. Đây là acceptance.** |
| 4 | `infrastructure/drizzle-user-repository.ts` | không unit test (Tech Spec §8.2) |
| 5 | Tailwind + `postcss.config.mjs` + `globals.css` + `layout.tsx` | không test; kiểm bằng `yarn dev` và `yarn build` |
| 6 | `shared/ui/button.tsx`, `banner.tsx` | **`button.test.tsx`, `banner.test.tsx` — ĐỎ trước** |
| 7 | `login-screen.tsx`, `google-submit-button.tsx` | **`login-screen.test.tsx` — ĐỎ trước** |
| 8 | `infrastructure/auth.ts`, `session.ts`, `containers/auth-actions.ts`, route handler, `app/page.tsx`, `app/groups/page.tsx` | không unit test; kiểm ở §10 |
| 9 | `knip.jsonc`, `.env.example`, Setup Guide, decision log | `yarn verify && yarn arch:probe && yarn build` |
| 10 | Smoke test thủ công (§10) → PR | |

Sau bước 3: `yarn test:coverage` — `provision-user.ts` phải ≥80% dòng (ngưỡng chưa ép trong CI cho tới E6-T5, nhưng đây là con số phải đạt).

---

# 10. Verify

## 10.1 Việc bạn phải tự làm — Google Cloud Console

1. **APIs & Services → OAuth consent screen**: User Type **External**, publishing status **Testing**. Thêm email của **từng người trong nhà** vào Test users — thiếu là Google chặn. Scope để mặc định (`openid`, `email`, `profile`), không thêm gì.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. **Authorized JavaScript origins**: `http://localhost:3000`, URL preview cố định, domain production.
4. **Authorized redirect URIs** — đúng ba dòng (Setup & Ops Guide §3):

   ```
   http://localhost:3000/api/auth/callback/google
   https://<preview-url-cố-định>/api/auth/callback/google
   https://<domain-production>/api/auth/callback/google
   ```

5. Bật **preview URL cố định** của Vercel — nếu không, mỗi PR đổi URL và đăng nhập trên preview hỏng (sự cố đã biết, Setup Guide §7).
6. Client ID → `AUTH_GOOGLE_ID`, Client secret → `AUTH_GOOGLE_SECRET`.

## 10.2 Local

```bash
openssl rand -base64 32   # → AUTH_SECRET trong .env.local
yarn db:migrate           # 0000_hard_speedball.sql, không có migration mới
yarn dev
```

Mở DevTools ở 390×844:

1. `/` → S-01 mặc định. Đối chiếu từng con số với prototype dòng 35–51.
2. Bấm nút → nhãn thành `Đang mở Google…`, nền `--surface-sunken`, **kích thước không đổi** → chuyển sang Google.
3. Đồng ý → quay về `/groups`, thấy tên + email.
4. `yarn db:studio` → bảng `users`: **đúng 1 dòng**, `provider = 'google'`, `provider_subject` là chuỗi số của Google → **bằng chứng TC-001**.
5. Đăng xuất → đăng nhập lại → `db:studio` vẫn **1 dòng**, `id` không đổi → **bằng chứng TC-002 ở tầng thật**.
6. Trạng thái lỗi: mở `/?error=Configuration` → banner đỏ hiện, nút vẫn còn. Luồng lỗi thật: đổi `AUTH_GOOGLE_SECRET` thành giá trị sai → restart → đăng nhập → Google hỏng ở bước đổi token → redirect về `/?error=…`.
7. Application → Cookies: có `authjs.session-token`, `HttpOnly`, `Expires` ≈ 30 ngày → **bằng chứng nửa "cookie phiên" của TC-001**.
8. Cửa sổ ẩn danh → `/groups` → bị đẩy về `/`.

**TC-003 không dựng được ở local** — không tồn tại hai tài khoản Google khác nhau cùng email. Đó chính là lý do bảng test xếp nó ở **tầng A**; bằng chứng là `yarn test` xanh. Ghi câu này vào mô tả PR.

## 10.3 Preview Vercel

Environment Variables, scope **Preview**: `DATABASE_URL` (Neon branch của PR), `AUTH_SECRET` (giá trị riêng, **không** dùng lại của production), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`. **Không đặt `AUTH_URL`.**

Mở PR → chờ preview → chạy lại kịch bản 1–5 **trên điện thoại thật, mạng di động** (Setup Guide §5.1).

## 10.4 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn build
```

`yarn test` phải in ra ba dòng `SPEC-001 — Đăng nhập › TC-00x: …`. Đính output vào PR.

---

# 11. Rủi ro

| Rủi ro | Dấu hiệu | Làm gì |
| --- | --- | --- |
| **`client.ts` throw lúc import → `yarn build` đỏ trong CI.** Rủi ro số một, dễ bỏ sót nhất vì `verify` vẫn xanh | CI xanh ở `verify`, đỏ ở `Build` với `Thiếu DATABASE_URL` | Đã xử lý ở §3. Nếu không muốn refactor: thêm `env: DATABASE_URL: postgresql://x:x@x/x` vào bước Build của workflow |
| Module augmentation của next-auth không merge | `tsc`: `Property 'userId' does not exist on type 'Session'` | Hai lối thoát ở cuối §6.10 |
| `exactOptionalPropertyTypes` xung đột type next-auth | `Type 'undefined' is not assignable` | Không gán `undefined` tường minh ở đâu cả; nếu `NextAuthConfig` vẫn kẹt thì dùng `satisfies NextAuthConfig` thay vì annotate |
| next-auth beta + Turbopack của Next 16 — **chưa verify runtime** | lỗi bundle `@auth/core` lúc `next build` | `serverExternalPackages: ['@auth/core', 'next-auth']` trong `next.config.ts`. Vẫn vỡ thì hạ `5.0.0-beta.31` rồi `.29` |
| `callbacks.jwt` trả `null` → xoá cookie **nhưng vẫn redirect** | vòng lặp đăng nhập, không có lỗi nào hiện ra | Đã tránh bằng `throw` + comment cảnh báo. Đừng "dọn dẹp" nó |
| Knip báo `next-auth` là dependency thừa | `yarn knip` đỏ | Plugin next của knip đã coi `src/app/**/route.ts` là production entry. Nếu vẫn đỏ, thêm `"src/app/api/auth/[...nextauth]/route.ts!"` vào `entry` |
| jscpd đỏ vì `app/page.tsx` và `app/groups/page.tsx` cùng khung `getCurrentUser` + `redirect` | `yarn dup` ≥3% | Hai hàm có logic ngược nhau nên khả năng thấp. Nếu đỏ thật thì tách `requireUser()` vào `infrastructure/session.ts` |
| `next/font/google` cần mạng lúc build | build treo hoặc lỗi tải font | Next tự host font sau khi tải và cache ở `.next/cache`. Môi trường build offline thì đổi sang `next/font/local` với 4 file `.woff2` commit vào repo — chỉ sửa `layout.tsx`, token `--font-be-vietnam-pro` giữ nguyên |
| `pages.error = '/'` gây `ErrorPageLoop` | Auth.js render trang lỗi mặc định thay vì S-01 | `/` không yêu cầu xác thực nên an toàn. Khi thêm `proxy.ts` ở E1-T3 trở đi, nhớ **loại `/` khỏi matcher** |
| Utility `text-*` và `font-*` tranh nhau | chữ sai weight | Đã tránh bằng cách không đặt `--text-*--font-weight` trong `@theme`; luôn viết weight tường minh |
| Neon cold start làm callback OAuth chậm | lần đăng nhập đầu trong ngày chậm 1–2 giây | Chấp nhận (R-01, Tech Spec §9). Callback chỉ 1 SELECT + tối đa 1 INSERT, không cần transaction nên driver HTTP là đủ. Đo thật ở E1-T12 |

---

# 12. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `0.1` | 2026-08-16 | Toàn bộ | Khởi tạo Implementation Guide cho E1-T1 (Đăng nhập Auth.js) | Kế hoạch Epic E1 |
