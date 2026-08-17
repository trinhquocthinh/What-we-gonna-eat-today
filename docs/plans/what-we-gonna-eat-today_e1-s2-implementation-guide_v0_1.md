# Implementation Guide — E1 Slice S2 / Group tối thiểu

## Version 0.1

**Status:** Ready to code
**Created:** 2026-08-17
**Upstream:** Master Plan v1.0 §3 (E1-T2, E1-T3, E1-T4), SDD v0.2 SPEC-002 / SPEC-018 / SPEC-019, Tech Spec v0.2 §2/§3/§4.2/§5, Test Cases v0.1 TC-004→TC-010, Design Handoff `docs/designs/README.md` S-02/S-03/S-04
**Tiền đề:** `docs/what-we-gonna-eat-today_e1-t1-implementation-guide_v0_1.md` đã thi công xong

> Tài liệu này là hướng dẫn thi công, không phải đặc tả. Khi nó lệch với SDD / Tech Spec / Design Handoff thì **các tài liệu kia đúng**.

---

# 0. Phạm vi và điều kiện xong

| ID | Việc | Giờ | Xong nghĩa là |
|---|---|---|---|
| E1-T2 | Schema `groups`, `group_members`, use case tạo Group | 2 | Tạo Group được, người tạo là Admin; TC-008→010 pass |
| E1-T3 | Authorization guard | 1 | Gọi thao tác Group khi không phải Member trả `ERR_NOT_GROUP_MEMBER`; TC-006, TC-007 pass |
| E1-T4 | Decision Date theo timezone Group | 1 | Hàm thuần, nhận `now` làm tham số, không mock `Date`; TC-004, TC-005 pass |

- [ ] TC-004→TC-010 pass
- [ ] Tạo được nhóm thật; `yarn db:studio` cho thấy `group_members.is_admin = true`
- [ ] `yarn verify` · `yarn arch:probe` · `yarn build` xanh
- [ ] Dòng ignore `decision-date.ts` trong `knip.jsonc` **đã gỡ** (§2.4)
- [ ] PR link SPEC-002, SPEC-018, SPEC-019

Màn hình dựng ở slice này: **S-02 Danh sách nhóm**, **S-03 Tạo nhóm**, và **vỏ rỗng của S-04 Trang nhóm**.

---

# 1. Bốn phát hiện đã kiểm bằng lệnh — đọc trước khi gõ

Không cái nào trong số này viết theo trí nhớ. Chúng đổi thiết kế, nên bỏ qua là hỏng.

## 1.1 `db.batch()` của neon-http LÀ transaction thật

`node_modules/drizzle-orm/neon-http/session.js`:

```js
async batch(queries) {
  …
  const batchResults = await this.client.transaction(builtQueries, queryConfig)
  …
}
…
async transaction(_transaction, _config = {}) {
  throw new Error("No transactions support in neon-http driver")
}
```

→ `createGroup` chèn `groups` + `group_members` **nguyên tử được ngay hôm nay**, thoả SDD §2.4 (*"Thao tác ghi thất bại không để lại thay đổi từng phần"*). **Không cần thêm driver WebSocket ở S2.**

Hai ràng buộc đi kèm:
- Batch là **non-interactive** — không đọc được id ở giữa. Vì vậy **`groups.id` phải sinh tường minh bằng `uuidv7()` trong infrastructure**, không dựa vào `$defaultFn` của schema.
- Kiểu là `batch<U extends BatchItem<'pg'>, T extends Readonly<[U, ...U[]]>>(batch: T)` — tuple ít nhất một phần tử. Truyền **literal array**, đừng build bằng `.map()` hay gán vào `const queries: X[]`.

E1-T7 và E1-T11 cần đọc-rồi-ghi trong cùng transaction — đó mới là chỗ `batch` không đủ và phải thêm `neon-serverless`. Ghi vào decision log để người làm E1-T7 không phải khám phá lại.

## 1.2 `Intl.supportedValuesOf('timeZone')` KHÔNG chứa `Asia/Ho_Chi_Minh`

```
$ node -e "…"
count 418 | has Ho_Chi_Minh false | has Saigon true
resolved                Asia/Saigon
canon('Asia/Ho_Chi_Minh') → Asia/Saigon
offset '+07:00' ACCEPTED
```

Ba hệ quả bắt buộc:

1. `isValidTimeZone` **tuyệt đối không** được viết bằng `supportedValuesOf().includes(tz)` — làm vậy sẽ **từ chối chính timezone của TC-004/TC-005**. Phải dùng try/catch trên `Intl.DateTimeFormat`.
2. Phải **canonical hoá trước khi lưu** và trước khi so khớp trong sheet. Firefox báo `Asia/Ho_Chi_Minh`, Chrome/V8 báo `Asia/Saigon`; không canonical hoá thì người dùng Firefox thấy **không mục nào** được đánh dấu.
3. `Intl` **chấp nhận** `'+07:00'`, mà đó không phải IANA. `isValidTimeZone` cần chặn thêm dạng offset.

Kết quả giống hệt nhau trên ICU 77 (Node 22) và ICU 78 (Node 24).

## 1.3 `Intl` cho ra đúng chuỗi thiết kế — không cần bảng hardcode

```
'2026-08-18' → 'Thứ Ba · 18 tháng 8'      (vi-VN, weekday/day/month = long, timeZone UTC)
Asia/Saigon  → 'Giờ Việt Nam' + 'GMT+7'   (shortGeneric vi-VN + shortOffset en-US)
Asia/Tokyo   → 'Giờ Nhật Bản' + 'GMT+9'
America/New_York → 'ET' + 'GMT-4'
```

Trên toàn bộ 418 zone: **323 zone** trả `'Giờ …'`, **95 zone** trả viết tắt kiểu `'ET'`, 0 zone trả dạng khác.

→ Quy tắc nhãn: `shortGeneric` bắt đầu bằng `'Giờ '` thì bỏ tiền tố; ngược lại lấy đoạn city của chuỗi IANA. Ghép `${name} · ${offset}` → `Asia/Saigon` cho ra đúng **`Việt Nam · GMT+7`** như thiết kế.

## 1.4 jsdom 30 không có `<dialog>.showModal()`

`node_modules/jsdom/lib/jsdom/living/nodes/HTMLDialogElement-impl.js` là một class **rỗng**; grep `showModal` trong `node_modules/jsdom/lib/` không ra kết quả.

→ **Không dùng `<dialog showModal>` cho `Sheet`.** Mọi test component chạm Sheet sẽ nổ `showModal is not a function`. Dùng `<div role="dialog" aria-modal="true">` + focus trap viết tay.

---

# 2. Sáu quyết định kiến trúc

## 2.1 Server Action đặt ở `src/app/`, KHÔNG ở `features/group/presentation/containers/`

Ràng buộc cứng, không phải sở thích. `CROSS_FEATURE_ZONES` trong `eslint.config.mjs` sinh zone:

```js
{ target: './src/features/group', from: './src/features', except: ['./group'] }
```

→ **mọi file dưới `src/features/group/` import `@/features/auth/**` đều là lỗi ESLint.** Mà `getCurrentUser()` sống ở `src/features/auth/infrastructure/session.ts`.

Comment ngay trong `eslint.config.mjs` đã nói trước điều này: *"Guard phân quyền (SPEC-019) KHÔNG nằm ở đây: nó được lắp ở `app/` trước khi gọi use case."*

→ `createGroupAction` đặt ở **`src/app/groups/actions.ts`**. Nó là *lắp ráp*, không phải business logic: đọc session → gọi use case → `revalidatePath` → `redirect`. Đúng Tech Spec §2.1.

`actions.ts` không phải tên file quy ước của Next nên nó **không** trở thành route.

## 2.2 Hai port, một adapter

```
application/membership-repository.ts   → interface MembershipRepository  (chỉ findMembership)
application/group-repository.ts        → interface GroupRepository       (createWithAdmin, listForUser, findById)
infrastructure/drizzle-group-repository.ts → export CẢ HAI adapter
```

`assertGroupAccess` được gọi ở *mọi* action, còn `createGroup` chỉ một chỗ. Tách port hẹp ra thì fake cho TC-006/TC-007 chỉ cần 5 dòng, thay vì phải stub 4 method không liên quan. Đó chính là điều Test Cases §1.3 muốn (*"Port là interface do chính tầng này định nghĩa nên viết tay rất ngắn"*).

## 2.3 "Membership đang hoạt động" kiểm ở application, KHÔNG ở SQL

Riêng cho guard. Port trả về **nguyên** membership kể cả đã bị gỡ (`{ isAdmin, removedAt }`); SQL chỉ `WHERE group_id = $1 AND user_id = $2`. Hàm thuần `isActiveMembership()` ở `group/domain/membership.ts` mới là nơi quyết định.

Lý do: TC-006/TC-007 là **tầng A mock port**. Nếu lọc ở SQL thì fake port chỉ trả `null`, và trường hợp *"member đã bị gỡ"* biến mất vào một `WHERE` không tầng nào kiểm được. Đặt ở application thì có thêm một test thật (TC-006b) mà không cần database.

**Ngoại lệ có chủ ý:** `listForUser` **có** lọc `removed_at IS NULL` trong SQL, vì đó là câu hỏi *"lấy dòng nào"*, không phải quyết định phân quyền. Ghi comment ở cả hai chỗ rằng vị từ SQL phải phản chiếu `isActiveMembership`.

## 2.4 `isValidTimeZone` ở `src/shared/time/`, và `resolveDecisionDate` được refactor để gọi nó

`group` không import được `session` (ESLint), mà *"thế nào là timezone hợp lệ"* phải giống hệt giữa nơi ghi (SPEC-002) và nơi đọc (SPEC-018). Hai bản sao lệch nhau nghĩa là Group lưu được một timezone mà `resolveDecisionDate` sau đó throw — một lỗi chỉ lộ ra khi ai đó mở phiên.

jscpd **không** phải lý do: khối try/catch chỉ ~30 token, dưới ngưỡng `minTokens: 50`. Lý do là đúng đắn, không phải công cụ.

**Gỡ được dòng knip ignore ở S2 — có.** `knip --production` không tính test là nơi sử dụng, nên điều kiện gỡ là có một importer production thật. S2 tạo ra hai chỗ: `app/groups/page.tsx` và `app/groups/[groupId]/page.tsx` đều gọi `resolveDecisionDate` để dựng caption ngày. Với `[groupId]` thì đây còn là cách **đúng**: header trang nhóm phải theo timezone của nhóm, không phải của server.

Nếu vì lý do nào đó bỏ cách dựng header này thì **phải giữ lại dòng ignore** và ghi rõ trong PR rằng E1-T4 chỉ hoàn tất phần domain.

## 2.5 Form S-03 dùng `useActionState`, validation chỉ ở server

- State là `{ nameError: string | null }` — **không có optional property nào**, nên `exactOptionalPropertyTypes` không có chỗ để nổ.
- Input là **controlled** (`useState`). React chỉ reset input *uncontrolled*; controlled input lấy value từ state của component, mà component không unmount qua vòng action → giá trị đã gõ tự còn nguyên. Nhờ vậy state **không cần** mang `name` về.
- Timezone vào `FormData` bằng `<input type="hidden">`. Giá trị lộ trong HTML là chấp nhận được (không phải bí mật), và **server vẫn validate lại** bằng `readGroupDraft` nên client thù địch không chèn rác được.

**Lệch có ý thức so với prototype:** prototype kiểm tên trống ngay tại client (state `tried`, 0ms). Guide này để **server** validate (một vòng ~200–400ms, nút ở trạng thái `pending`). Lý do: SPEC-002 chỉ có một nguồn sự thật là `readGroupDraft` ở domain; nhân bản luật đó sang client là đúng thứ sẽ lệch nhau sau ba tháng. Hình ảnh cuối vẫn khớp thiết kế 100%, chỉ khác thời điểm.

## 2.6 S-04 ở S2 chỉ dựng vỏ rỗng

**Dựng:** header (caption ngày + `<h1>` tên nhóm) + thẻ rỗng đầy đủ (h2 `display`, body-lg, kẻ ngang, caption, ba ví dụ `--ink-faint`).

**Bỏ:** ba hàng lối tắt (Danh mục món / Quy định bữa ăn / Thành viên), CTA "Thêm món đầu tiên", nút quiet "Nhóm" góc phải.

Cả bốn đều dẫn tới màn hình chưa tồn tại (E1-T5, E1-T6, E2). Dựng "dạng tĩnh" tạo ra nút bấm không làm gì — tệ hơn hẳn không có, và `typedRoutes` sẽ chặn `<Link href="/groups/x/dishes">` khi route chưa tồn tại.

**Thay vào đó** đặt một nút `quiet` canh giữa ở đáy: "Nhóm của bạn" → `/groups`. Đó là điều khiển duy nhất chạy thật, và nó cứu người dùng khỏi ngõ cụt sau khi tạo nhóm. Ghi `// E1-T5: thay bằng ba hàng lối tắt + CTA "Thêm món đầu tiên"` ngay tại chỗ.

---

# 3. Bẫy Next 16 riêng cho slice này

Ngoài 8 điểm đã ghi ở guide S1 (`middleware`→`proxy`, Request API async, cấm helper `PageProps`/`RouteContext`, Turbopack mặc định, `unauthorized()` cần `authInterrupts`, `redirect()` throw nên phải ngoài try/catch, `typedRoutes` chỉ type `Link href`, Server Action gọi được bằng POST trực tiếp):

9. **`params` của route động là `Promise`**, phải `await`. Và vẫn **không** dùng helper `PageProps<'/groups/[groupId]'>` — nó do `next typegen` sinh vào `.next/types`, mà CI chạy `yarn typecheck` **trước** `yarn build`. Khai thủ công `{ params: Promise<{ groupId: string }> }`.
10. Repo **không bật `cacheComponents`** → nằm ở caching model cũ: page dùng `auth()`/`cookies()` là dynamic, không bị Full Route Cache. Rủi ro còn lại chỉ là **client Router Cache** → gọi `revalidatePath('/groups')` trong action **trước** `redirect`.
11. **`forbidden()` cần `experimental.authInterrupts`** — guide này **không** bật. Dùng `notFound()` cho "không phải member": vừa khỏi sửa config, vừa đúng NFR-04 (không lộ nhóm có tồn tại hay không).
12. `redirect(url, type)` trả `never`. Trong **Server Action** mặc định là `push`, nơi khác là `replace`.
13. Server Function closure variables được Next mã hoá trước khi gửi xuống client — nhưng vẫn theo docs: **action tự đọc session**, không nhận `userId` từ ngoài.
14. **Vitest không test được async Server Component** — `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md` nói thẳng. Khớp Tech Spec §8.2: không viết test cho `page.tsx`.

---

# 4. Cây file

```
src/
├── shared/
│   ├── time/                                          ← thư mục MỚI
│   │   ├── time-zone.ts              + .test.ts       mới
│   │   └── format-vietnamese-date.ts + .test.ts       mới
│   ├── testing/factories.ts                           SỬA — +makeGroup, +makeMembership
│   ├── ui/button.tsx                 + .test.tsx      SỬA — size, quiet, quietAccent, muted
│   ├── ui/skeleton.tsx                                mới
│   ├── ui/text-field.tsx             + .test.tsx      mới
│   ├── ui/empty-state-card.tsx                        mới
│   ├── ui/sheet.tsx                  + .test.tsx      mới — 'use client'
│   └── db/schema.ts                                   SỬA — +groups, +groupMembers
│
├── features/
│   ├── session/domain/decision-date.ts                SỬA — dùng isValidTimeZone
│   └── group/
│       ├── domain/group-draft.ts     + .test.ts       mới — SPEC-002 validation
│       ├── domain/membership.ts      + .test.ts       mới
│       ├── application/membership-repository.ts       mới — PORT hẹp
│       ├── application/group-repository.ts            mới — PORT rộng
│       ├── application/assert-group-access.ts + .test.ts  mới — SPEC-019
│       ├── application/create-group.ts        + .test.ts  mới — SPEC-002
│       ├── application/list-groups.ts         + .test.ts  mới
│       ├── infrastructure/drizzle-group-repository.ts     mới
│       └── presentation/components/
│           ├── group-card.tsx                         mới
│           ├── group-list-screen.tsx + .test.tsx      mới — S-02
│           ├── create-group-form.tsx + .test.tsx      mới — S-03, 'use client'
│           ├── time-zone-field.tsx                    mới — 'use client'
│           ├── time-zone-picker-sheet.tsx + .test.tsx mới — 'use client'
│           └── group-overview-screen.tsx              mới — S-04 vỏ rỗng
│
└── app/
    ├── globals.css                                    SỬA — +scrim, +animate-skeleton
    └── groups/
        ├── page.tsx                                   VIẾT LẠI (thay stub S1)
        ├── loading.tsx                                mới
        ├── error.tsx                                  mới — 'use client'
        ├── actions.ts                                 mới — 'use server'
        ├── new/page.tsx                               mới
        └── [groupId]/page.tsx                         mới

src/shared/db/migrations/0001_group_and_members.sql    sinh bởi drizzle-kit
```

**Không có** `src/features/group/presentation/containers/` — xem §2.1.

---

# 5. Nền dùng chung

## 5.1 `src/app/globals.css` — thêm vào `@theme`

```css
@theme {
  /* …giữ nguyên toàn bộ token của S1… */

  --color-scrim: rgba(28, 25, 23, 0.28); /* nền mờ sau sheet */

  /* Design Handoff: khối --surface-sunken, opacity .55↔1, chu kỳ 1.4s. Không vòng quay. */
  --animate-skeleton: skeleton 1.4s ease-in-out infinite;

  @keyframes skeleton {
    0%,
    100% {
      opacity: 0.55;
    }
    50% {
      opacity: 1;
    }
  }
}
```

## 5.2 `src/shared/time/time-zone.ts`

```ts
/**
 * Timezone dùng chung cho SPEC-002 (nơi ghi) và SPEC-018 (nơi đọc).
 *
 * Đặt ở `shared/` chứ không trong feature nào: `group` không import được
 * `session` (ESLint chặn cross-feature), mà hai nơi PHẢI hiểu "timezone hợp lệ"
 * giống hệt nhau. Lệch nhau nghĩa là Group lưu được một giá trị mà
 * `resolveDecisionDate` sau đó ném lỗi — một quả mìn chỉ nổ khi ai đó mở phiên.
 */

/** Chỉ để HIỂN THỊ khi chưa có Group context (ví dụ caption ngày ở /groups).
 *  TUYỆT ĐỐI không dùng làm timezone của Group hay để tính Decision Date:
 *  SPEC-018 nói rõ "không có giá trị mặc định ẩn". */
export const DISPLAY_TIME_ZONE_FALLBACK = 'Asia/Ho_Chi_Minh'

// Intl chấp nhận cả dạng offset ('+07:00', '-0500') — đã kiểm. Nhưng SPEC-002
// yêu cầu IANA identifier, nên chặn riêng dạng này.
const OFFSET_LIKE = /^[+-]?\d/

/**
 * KHÔNG hiện thực bằng `Intl.supportedValuesOf('timeZone').includes(tz)`.
 * Danh sách đó đã canonical hoá và KHÔNG chứa 'Asia/Ho_Chi_Minh' (đã kiểm trên
 * ICU 77 lẫn 78) — dùng nó sẽ từ chối chính timezone của TC-004/TC-005.
 */
export function isValidTimeZone(timeZone: string): boolean {
  const value = timeZone.trim()
  if (value === '' || OFFSET_LIKE.test(value)) {
    return false
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

/** Dạng chuẩn theo ICU: 'Asia/Ho_Chi_Minh' → 'Asia/Saigon'. `null` nếu không hợp lệ.
 *  Luôn canonical hoá trước khi ghi DB, nếu không thì mỗi trình duyệt lưu một
 *  chuỗi khác nhau cho cùng một múi giờ. */
export function canonicalTimeZone(timeZone: string): string | null {
  if (!isValidTimeZone(timeZone)) {
    return null
  }
  return new Intl.DateTimeFormat('en-US', { timeZone: timeZone.trim() }).resolvedOptions().timeZone
}

function readTimeZoneName(
  timeZone: string,
  now: Date,
  locale: string,
  style: 'shortGeneric' | 'shortOffset',
): string {
  const parts = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: style }).formatToParts(now)
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone
}

const VIETNAMESE_TIME_PREFIX = 'Giờ '

/**
 * 'Asia/Saigon' → 'Việt Nam · GMT+7'. Đã kiểm trên cả 418 zone: 323 zone cho
 * chuỗi dạng 'Giờ …', 95 zone cho viết tắt kiểu 'ET' — nhánh else lấy tên
 * thành phố từ chính chuỗi IANA. Không có bảng hardcode nào ở đây.
 */
export function formatTimeZoneLabel(timeZone: string, now: Date): string {
  const canonical = canonicalTimeZone(timeZone)
  if (canonical === null) {
    return timeZone
  }

  const generic = readTimeZoneName(canonical, now, 'vi-VN', 'shortGeneric')
  const offset = readTimeZoneName(canonical, now, 'en-US', 'shortOffset')

  const name = generic.startsWith(VIETNAMESE_TIME_PREFIX)
    ? generic.slice(VIETNAMESE_TIME_PREFIX.length)
    : (canonical.split('/').at(-1) ?? canonical).replaceAll('_', ' ')

  return `${name} · ${offset}`
}
```

`src/shared/time/time-zone.test.ts` — **viết trước**:

```ts
import { describe, expect, it } from 'vitest'

import { canonicalTimeZone, formatTimeZoneLabel, isValidTimeZone } from './time-zone'

const NOW = new Date('2026-08-18T10:00:00Z')

describe('isValidTimeZone', () => {
  // Test này tồn tại để chặn một "tối ưu" cụ thể: đổi sang
  // Intl.supportedValuesOf().includes() sẽ làm dòng đầu tiên đỏ.
  it('chấp nhận Asia/Ho_Chi_Minh dù supportedValuesOf không liệt kê nó', () => {
    expect(isValidTimeZone('Asia/Ho_Chi_Minh')).toBe(true)
    expect(Intl.supportedValuesOf('timeZone').includes('Asia/Ho_Chi_Minh')).toBe(false)
  })

  it('chấp nhận dạng canonical và UTC', () => {
    expect(isValidTimeZone('Asia/Saigon')).toBe(true)
    expect(isValidTimeZone('UTC')).toBe(true)
  })

  it('từ chối chuỗi rỗng và toàn khoảng trắng', () => {
    expect(isValidTimeZone('')).toBe(false)
    expect(isValidTimeZone('   ')).toBe(false)
  })

  it('TC-009: từ chối Asia/Saigon_typo', () => {
    expect(isValidTimeZone('Asia/Saigon_typo')).toBe(false)
  })

  it('từ chối dạng offset dù Intl chấp nhận — SPEC-002 yêu cầu IANA', () => {
    expect(isValidTimeZone('+07:00')).toBe(false)
    expect(isValidTimeZone('-0500')).toBe(false)
  })
})

describe('canonicalTimeZone', () => {
  it('quy về dạng chuẩn của ICU', () => {
    expect(canonicalTimeZone('Asia/Ho_Chi_Minh')).toBe('Asia/Saigon')
    expect(canonicalTimeZone('Asia/Saigon')).toBe('Asia/Saigon')
  })

  it('trả null khi không hợp lệ', () => {
    expect(canonicalTimeZone('Asia/Saigon_typo')).toBeNull()
  })
})

describe('formatTimeZoneLabel', () => {
  it('dựng nhãn tiếng Việt cho múi giờ có tên', () => {
    expect(formatTimeZoneLabel('Asia/Saigon', NOW)).toBe('Việt Nam · GMT+7')
    expect(formatTimeZoneLabel('Asia/Ho_Chi_Minh', NOW)).toBe('Việt Nam · GMT+7')
    expect(formatTimeZoneLabel('Asia/Tokyo', NOW)).toBe('Nhật Bản · GMT+9')
  })

  it('lấy tên thành phố khi Intl chỉ trả viết tắt', () => {
    expect(formatTimeZoneLabel('America/New_York', NOW)).toContain('New York · GMT-')
  })
})
```

## 5.3 `src/shared/time/format-vietnamese-date.ts`

```ts
/**
 * Caption ngày ở header S-02 và S-04: 'Thứ Ba · 18 tháng 8'.
 *
 * Nhận chuỗi ngày lịch chứ KHÔNG nhận `Date`: người gọi đã quy đổi sang
 * timezone của Group bằng `resolveDecisionDate` rồi, nên ở đây không còn
 * timezone nào len vào được và test không phải mock gì.
 */
export function formatVietnameseDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`formatVietnameseDate: ngày không hợp lệ: "${isoDate}"`)
  }

  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).formatToParts(date)

  const read = (type: Intl.DateTimeFormatPartTypes): string => {
    const part = parts.find((candidate) => candidate.type === type)
    if (part === undefined) {
      throw new RangeError(`formatVietnameseDate: thiếu thành phần "${type}"`)
    }
    return part.value
  }

  return `${read('weekday')} · ${read('day')} ${read('month')}`
}
```

`format-vietnamese-date.test.ts` — **viết trước**:

```ts
import { describe, expect, it } from 'vitest'

import { formatVietnameseDate } from './format-vietnamese-date'

describe('formatVietnameseDate', () => {
  it('dựng đúng chuỗi header của thiết kế', () => {
    expect(formatVietnameseDate('2026-08-18')).toBe('Thứ Ba · 18 tháng 8')
  })

  it('không zero-pad ngày và tháng', () => {
    expect(formatVietnameseDate('2026-01-01')).toBe('Thứ Năm · 1 tháng 1')
  })

  it('gọi Chủ Nhật đúng tên, không phải "Thứ 1"', () => {
    expect(formatVietnameseDate('2026-08-16')).toBe('Chủ Nhật · 16 tháng 8')
  })

  it('ném lỗi với chuỗi không phải ngày', () => {
    expect(() => formatVietnameseDate('hôm nay')).toThrow(RangeError)
  })
})
```

## 5.4 `src/features/session/domain/decision-date.ts` — refactor

Chỉ đổi phần kiểm timezone. **Không sửa file test** — 7 `it` hiện có là lưới an toàn của bước này.

```ts
import { isValidTimeZone } from '@/shared/time/time-zone'

// …giữ nguyên docblock SPEC-018 và type DecisionDate…

export function resolveDecisionDate(now: Date, timeZone: string): DecisionDate {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('resolveDecisionDate: `now` không phải thời điểm hợp lệ')
  }

  // Dùng chung với SPEC-002 để Group không lưu được timezone mà hàm này từ chối.
  if (!isValidTimeZone(timeZone)) {
    throw new RangeError(`resolveDecisionDate: timezone không hợp lệ: "${timeZone}"`)
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const get = (type: Intl.DateTimeFormatPartTypes): string => {
    const part = parts.find((p) => p.type === type)
    if (part === undefined) {
      throw new RangeError(`resolveDecisionDate: thiếu thành phần "${type}"`)
    }
    return part.value
  }

  return `${get('year')}-${get('month')}-${get('day')}`
}
```

> `domain/` import `@/shared/time/*` là hợp lệ: `no-restricted-imports` chỉ chặn react/next/server-only/drizzle/neon, và `LAYER_ZONES` chỉ chặn `./src/shared/db`.

---

# 6. Domain của `group`

## 6.1 `src/features/group/domain/group-draft.ts`

```ts
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'
import { canonicalTimeZone } from '@/shared/time/time-zone'

/**
 * SPEC-002 — validation của "Tạo Group". Hàm thuần, không throw, không chạm DB.
 */
export type GroupDraft = {
  readonly name: string
  readonly timezone: string
}

export type GroupDraftError = 'NAME_EMPTY' | 'NAME_TOO_LONG' | 'TIMEZONE_INVALID'

const MAX_NAME_LENGTH = 60

export function readGroupDraft(input: {
  readonly name: string
  readonly timezone: string
}): Result<GroupDraft, GroupDraftError> {
  // NFC trước khi trim: 'Nhà' gõ bằng dấu tổ hợp và bằng ký tự dựng sẵn phải là
  // cùng một tên nhóm.
  const name = input.name.normalize('NFC').trim()

  if (name === '') {
    return err('NAME_EMPTY')
  }

  // Đếm code point chứ không dùng `.length` (đơn vị UTF-16): SPEC-002 nói "1..60",
  // và với tên tiếng Việt hai cách đếm cho ra số khác nhau.
  if (Array.from(name).length > MAX_NAME_LENGTH) {
    return err('NAME_TOO_LONG')
  }

  // Ghi dạng canonical để mọi trình duyệt lưu cùng một chuỗi cho cùng múi giờ.
  const timezone = canonicalTimeZone(input.timezone)
  if (timezone === null) {
    return err('TIMEZONE_INVALID')
  }

  return ok({ name, timezone })
}
```

`group-draft.test.ts` — **viết trước**:

```ts
import { describe, expect, it } from 'vitest'

import { readGroupDraft } from './group-draft'

const VALID_TIMEZONE = 'Asia/Ho_Chi_Minh'

describe('readGroupDraft', () => {
  it('cắt khoảng trắng thừa ở tên', () => {
    const result = readGroupDraft({ name: '  Nhà Bảy Hiền  ', timezone: VALID_TIMEZONE })
    expect(result.ok && result.value.name).toBe('Nhà Bảy Hiền')
  })

  it('lưu timezone ở dạng canonical', () => {
    const result = readGroupDraft({ name: 'Nhà Bảy Hiền', timezone: 'Asia/Ho_Chi_Minh' })
    expect(result.ok && result.value.timezone).toBe('Asia/Saigon')
  })

  it('TC-010: tên toàn khoảng trắng thì NAME_EMPTY', () => {
    const result = readGroupDraft({ name: '   ', timezone: VALID_TIMEZONE })
    expect(result.ok === false && result.error).toBe('NAME_EMPTY')
  })

  it('TC-009: timezone sai thì TIMEZONE_INVALID', () => {
    const result = readGroupDraft({ name: 'Nhà Bảy Hiền', timezone: 'Asia/Saigon_typo' })
    expect(result.ok === false && result.error).toBe('TIMEZONE_INVALID')
  })

  it('60 ký tự thì được, 61 thì không — đếm theo code point', () => {
    expect(readGroupDraft({ name: 'à'.repeat(60), timezone: VALID_TIMEZONE }).ok).toBe(true)
    const tooLong = readGroupDraft({ name: 'à'.repeat(61), timezone: VALID_TIMEZONE })
    expect(tooLong.ok === false && tooLong.error).toBe('NAME_TOO_LONG')
  })
})
```

## 6.2 `src/features/group/domain/membership.ts`

```ts
/**
 * SPEC-019 — "membership đang hoạt động".
 *
 * Vị từ này CỐ Ý nằm ở domain chứ không ở mệnh đề WHERE: TC-006/TC-007 là test
 * tầng A mock port, nên nếu lọc `removed_at` trong SQL thì trường hợp "member
 * đã bị gỡ" không tầng nào kiểm được.
 *
 * `listForUser` ở infrastructure có lọc `removed_at IS NULL` — đó là câu hỏi
 * "lấy dòng nào", không phải quyết định phân quyền. Hai chỗ phải khớp nhau.
 */
export type Membership = {
  readonly isAdmin: boolean
  readonly removedAt: Date | null
}

export function isActiveMembership(membership: Membership): boolean {
  return membership.removedAt === null
}
```

`membership.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { isActiveMembership } from './membership'

describe('isActiveMembership', () => {
  it('membership chưa bị gỡ thì đang hoạt động', () => {
    expect(isActiveMembership({ isAdmin: false, removedAt: null })).toBe(true)
  })

  it('membership đã bị gỡ thì không', () => {
    expect(isActiveMembership({ isAdmin: true, removedAt: new Date('2026-08-01') })).toBe(false)
  })
})
```

---

# 7. Application của `group`

## 7.1 `src/features/group/application/group-repository.ts` — PORT

```ts
export type GroupSummary = {
  readonly id: string
  readonly name: string
  readonly timezone: string
}

export type GroupListItem = GroupSummary & {
  readonly memberCount: number
}

export type NewGroupWithAdmin = {
  readonly name: string
  readonly timezone: string
  readonly creatorUserId: string
}

export interface GroupRepository {
  /**
   * Chèn `groups` và `group_members` NGUYÊN TỬ (SDD §2.4). Người tạo là Member
   * kèm `is_admin = true` (SPEC-002).
   */
  createWithAdmin(input: NewGroupWithAdmin): Promise<GroupSummary>

  /** Chỉ những Group mà `userId` còn membership đang hoạt động. */
  listForUser(userId: string): Promise<GroupListItem[]>

  findById(groupId: string): Promise<GroupSummary | null>
}
```

## 7.2 `src/features/group/application/membership-repository.ts` — PORT

```ts
import type { Membership } from '../domain/membership'

/**
 * Port hẹp, tách khỏi `GroupRepository`: guard được gọi ở MỌI action, và fake
 * cho TC-006/TC-007 chỉ cần đúng một method.
 */
export interface MembershipRepository {
  /**
   * Trả về membership kể cả khi đã bị gỡ (`removedAt !== null`). Việc quyết định
   * "còn hiệu lực hay không" thuộc về `isActiveMembership` ở domain — xem lý do
   * trong `domain/membership.ts`.
   */
  findMembership(groupId: string, userId: string): Promise<Membership | null>
}
```

## 7.3 `src/features/group/application/assert-group-access.ts`

```ts
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import { isActiveMembership } from '../domain/membership'
import type { MembershipRepository } from './membership-repository'

/** SPEC-019. Hai mức duy nhất trong Group — không có RBAC nhiều tầng. */
export type GroupRole = 'MEMBER' | 'ADMIN'

export type AssertGroupAccessDeps = {
  readonly memberships: MembershipRepository
}

export type AssertGroupAccessInput = {
  readonly userId: string
  readonly groupId: string
  readonly requiredRole: GroupRole
}

/**
 * SPEC-019 — Authorization guard.
 *
 * Tech Spec §5: mọi Server Action và Route Handler gọi hàm này TRƯỚC business
 * logic. Không dựa vào việc ẩn nút trên UI — Server Action gọi được bằng POST
 * trực tiếp.
 *
 * Kiểm tra Creator của Session KHÔNG nằm ở đây: Creator là thuộc tính của
 * Session chứ không phải của Group (SPEC-019, Tech Spec §5).
 */
export async function assertGroupAccess(
  deps: AssertGroupAccessDeps,
  input: AssertGroupAccessInput,
): Promise<Result<void, Failure>> {
  const membership = await deps.memberships.findMembership(input.groupId, input.userId)

  if (membership === null || !isActiveMembership(membership)) {
    return err(failure('ERR_NOT_GROUP_MEMBER', { groupId: input.groupId }))
  }

  if (input.requiredRole === 'ADMIN' && !membership.isAdmin) {
    return err(failure('ERR_NOT_GROUP_ADMIN', { groupId: input.groupId }))
  }

  return ok(undefined)
}
```

`assert-group-access.test.ts` — **viết trước**:

```ts
import { describe, expect, it } from 'vitest'

import { makeMembership } from '@/shared/testing/factories'

import type { Membership } from '../domain/membership'
import type { MembershipRepository } from './membership-repository'
import { assertGroupAccess } from './assert-group-access'

function makeFakeMembershipRepository(membership: Membership | null) {
  let calls = 0

  const repository: MembershipRepository = {
    async findMembership() {
      calls += 1
      return membership
    },
  }

  return {
    repository,
    get calls() {
      return calls
    },
  }
}

const INPUT = { userId: 'user-1', groupId: 'group-1' } as const

describe('SPEC-019 — Authorization guard', () => {
  it('TC-006: User không thuộc Group thì ERR_NOT_GROUP_MEMBER', async () => {
    const fake = makeFakeMembershipRepository(null)

    const result = await assertGroupAccess(
      { memberships: fake.repository },
      { ...INPUT, requiredRole: 'MEMBER' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_GROUP_MEMBER')
  })

  it('TC-006b: membership đã bị gỡ vẫn là ERR_NOT_GROUP_MEMBER', async () => {
    const fake = makeFakeMembershipRepository(
      makeMembership({ isAdmin: true, removedAt: new Date('2026-08-01T00:00:00Z') }),
    )

    const result = await assertGroupAccess(
      { memberships: fake.repository },
      { ...INPUT, requiredRole: 'MEMBER' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_GROUP_MEMBER')
  })

  it('TC-007: Member không phải Admin gọi thao tác cần Admin thì ERR_NOT_GROUP_ADMIN', async () => {
    const fake = makeFakeMembershipRepository(makeMembership({ isAdmin: false }))

    const result = await assertGroupAccess(
      { memberships: fake.repository },
      { ...INPUT, requiredRole: 'ADMIN' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_NOT_GROUP_ADMIN')
  })

  it('Member đang hoạt động qua được mức MEMBER', async () => {
    const fake = makeFakeMembershipRepository(makeMembership({ isAdmin: false }))

    const result = await assertGroupAccess(
      { memberships: fake.repository },
      { ...INPUT, requiredRole: 'MEMBER' },
    )

    expect(result.ok).toBe(true)
    expect(fake.calls).toBe(1)
  })

  it('Admin qua được cả hai mức', async () => {
    const admin = makeMembership({ isAdmin: true })

    for (const requiredRole of ['MEMBER', 'ADMIN'] as const) {
      const fake = makeFakeMembershipRepository(admin)
      const result = await assertGroupAccess({ memberships: fake.repository }, { ...INPUT, requiredRole })
      expect(result.ok).toBe(true)
    }
  })
})
```

## 7.4 `src/features/group/application/create-group.ts`

```ts
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { GroupDraftError } from '../domain/group-draft'
import { readGroupDraft } from '../domain/group-draft'
import type { GroupRepository, GroupSummary } from './group-repository'

export type CreateGroupDeps = {
  readonly groups: GroupRepository
}

export type CreateGroupInput = {
  readonly creatorUserId: string
  readonly name: string
  readonly timezone: string
}

/** `field` là thứ presentation cần để đặt lỗi NGAY DƯỚI đúng input
 *  (Design Criteria: lỗi nằm cạnh thứ gây ra lỗi, không dùng dialog). */
const FAILURE_DETAILS: Record<GroupDraftError, { field: string; reason: string }> = {
  NAME_EMPTY: { field: 'name', reason: 'Tên nhóm không được để trống' },
  NAME_TOO_LONG: { field: 'name', reason: 'Tên nhóm tối đa 60 ký tự' },
  TIMEZONE_INVALID: { field: 'timezone', reason: 'Múi giờ không phải IANA hợp lệ' },
}

/**
 * SPEC-002 — Tạo Group. Người tạo trở thành Member kèm role ADMIN.
 *
 * Validation chạy TRƯỚC khi chạm repository, nên TC-009/TC-010 không ghi gì vào
 * database — đó chính là điều hai test đó khẳng định.
 */
export async function createGroup(
  deps: CreateGroupDeps,
  input: CreateGroupInput,
): Promise<Result<GroupSummary, Failure>> {
  const draft = readGroupDraft({ name: input.name, timezone: input.timezone })

  if (!draft.ok) {
    return err(failure('ERR_VALIDATION', FAILURE_DETAILS[draft.error]))
  }

  const created = await deps.groups.createWithAdmin({
    name: draft.value.name,
    timezone: draft.value.timezone,
    creatorUserId: input.creatorUserId,
  })

  return ok(created)
}
```

`create-group.test.ts` — **viết trước. Đây là acceptance của E1-T2.**

```ts
import { describe, expect, it } from 'vitest'

import { makeGroup } from '@/shared/testing/factories'

import type { GroupListItem, GroupRepository, NewGroupWithAdmin } from './group-repository'
import { createGroup } from './create-group'

type Row = NewGroupWithAdmin & { id: string; isAdmin: boolean }

/** Cổng giả là object thuần, không auto-mock (Test Cases §1.3). */
function makeFakeGroupRepository() {
  const rows: Row[] = []

  const repository: GroupRepository = {
    async createWithAdmin(input) {
      const id = `group-${rows.length + 1}`
      rows.push({ ...input, id, isAdmin: true })
      return { id, name: input.name, timezone: input.timezone }
    },
    async listForUser(): Promise<GroupListItem[]> {
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        timezone: row.timezone,
        memberCount: 1,
      }))
    },
    async findById(groupId) {
      const found = rows.find((row) => row.id === groupId)
      return found === undefined ? null : { id: found.id, name: found.name, timezone: found.timezone }
    },
  }

  return { repository, rows }
}

const CREATOR = makeGroup().creatorUserId

describe('SPEC-002 — Tạo Group', () => {
  it('TC-008: tạo Group hợp lệ thì người tạo là Member và có is_admin', async () => {
    const fake = makeFakeGroupRepository()

    const result = await createGroup(
      { groups: fake.repository },
      { creatorUserId: CREATOR, name: 'Nhà Bảy Hiền', timezone: 'Asia/Ho_Chi_Minh' },
    )

    expect(result.ok).toBe(true)
    expect(fake.rows).toHaveLength(1)
    expect(fake.rows[0]?.creatorUserId).toBe(CREATOR)
    expect(fake.rows[0]?.isAdmin).toBe(true)
    // Canonical hoá xảy ra ở domain, use case chỉ chuyển tiếp.
    expect(fake.rows[0]?.timezone).toBe('Asia/Saigon')
  })

  it('TC-009: timezone sai thì ERR_VALIDATION và KHÔNG ghi DB', async () => {
    const fake = makeFakeGroupRepository()

    const result = await createGroup(
      { groups: fake.repository },
      { creatorUserId: CREATOR, name: 'Nhà Bảy Hiền', timezone: 'Asia/Saigon_typo' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_VALIDATION')
    expect(fake.rows).toHaveLength(0)
  })

  it('TC-010: tên toàn khoảng trắng thì ERR_VALIDATION', async () => {
    const fake = makeFakeGroupRepository()

    const result = await createGroup(
      { groups: fake.repository },
      { creatorUserId: CREATOR, name: '   ', timezone: 'Asia/Ho_Chi_Minh' },
    )

    expect(result.ok === false && result.error.code).toBe('ERR_VALIDATION')
    expect(result.ok === false && result.error.details?.['field']).toBe('name')
    expect(fake.rows).toHaveLength(0)
  })
})
```

## 7.5 `src/features/group/application/list-groups.ts`

```ts
import type { GroupListItem, GroupRepository } from './group-repository'

export type ListGroupsDeps = {
  readonly groups: GroupRepository
}

/**
 * Trả mảng trực tiếp chứ không phải `Result`: đọc danh sách không có trạng thái
 * thất bại nghiệp vụ nào. Lỗi hạ tầng để nổi lên cho `app/groups/error.tsx`.
 *
 * Use case mỏng nhưng có lý do tồn tại: E1-T7 sẽ thêm luật "Group có phiên đang
 * chạy nằm trên cùng" vào đúng chỗ này, và khi đó nó có test riêng.
 */
export async function listGroups(deps: ListGroupsDeps, userId: string): Promise<GroupListItem[]> {
  return deps.groups.listForUser(userId)
}
```

`list-groups.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import type { GroupListItem, GroupRepository } from './group-repository'
import { listGroups } from './list-groups'

function makeFakeRepository(items: GroupListItem[]): GroupRepository {
  return {
    async createWithAdmin() {
      throw new Error('không dùng trong test này')
    },
    async listForUser() {
      return items
    },
    async findById() {
      return null
    },
  }
}

describe('listGroups', () => {
  it('chưa có nhóm nào thì trả mảng rỗng', async () => {
    expect(await listGroups({ groups: makeFakeRepository([]) }, 'user-1')).toEqual([])
  })

  it('giữ nguyên thứ tự port trả về — E1-T7 sẽ thêm luật sắp xếp', async () => {
    const items: GroupListItem[] = [
      { id: 'g1', name: 'Nhà Bảy Hiền', timezone: 'Asia/Saigon', memberCount: 4 },
      { id: 'g2', name: 'Nhà ngoại Cần Thơ', timezone: 'Asia/Saigon', memberCount: 5 },
    ]

    expect(await listGroups({ groups: makeFakeRepository(items) }, 'user-1')).toEqual(items)
  })
})
```

## 7.6 `src/shared/testing/factories.ts` — thêm

```ts
export type TestGroup = {
  id: string
  name: string
  timezone: string
  creatorUserId: string
}

export function makeGroup(overrides: Partial<TestGroup> = {}): TestGroup {
  return {
    id: '01920000-0000-7000-8000-0000000000a1',
    name: 'Nhà Bảy Hiền',
    timezone: 'Asia/Ho_Chi_Minh',
    creatorUserId: '01920000-0000-7000-8000-000000000001',
    ...overrides,
  }
}

export type TestMembership = {
  isAdmin: boolean
  removedAt: Date | null
}

export function makeMembership(overrides: Partial<TestMembership> = {}): TestMembership {
  return { isAdmin: false, removedAt: null, ...overrides }
}
```

---

# 8. Schema, migration, infrastructure

## 8.1 `src/shared/db/schema.ts` — thêm

Import thêm `boolean` và `index` từ `drizzle-orm/pg-core`.

```ts
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
```

## 8.2 Migration

```bash
yarn db:generate --name=group_and_members
yarn db:migrate
```

Sinh ra `src/shared/db/migrations/0001_group_and_members.sql` + `meta/0001_snapshot.json` + cập nhật `meta/_journal.json`. **Không sửa tay.** Mở file `.sql` đọc lại, đối chiếu với Tech Spec §3.1.

`drizzle.config.ts` không phải sửa gì. Lưu ý `generate` vẫn cần `.env.local` tồn tại vì config throw khi thiếu `DATABASE_URL`.

Sinh migration ở **commit riêng, cuối cùng**, ngay trước khi mở PR — `_journal.json` là chỗ merge conflict dễ xảy ra nhất.

## 8.3 `src/features/group/infrastructure/drizzle-group-repository.ts`

```ts
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { getDb } from '@/shared/db/client'
import { groupMembers, groups } from '@/shared/db/schema'

import type {
  GroupListItem,
  GroupRepository,
  GroupSummary,
  NewGroupWithAdmin,
} from '../application/group-repository'
import type { MembershipRepository } from '../application/membership-repository'
import type { Membership } from '../domain/membership'

/**
 * `db.batch([...])` của driver neon-http LÀ một transaction Postgres thật —
 * `neon-http/session.js` gọi `client.transaction(builtQueries)` và Neon gửi kèm
 * header `Neon-Batch-Isolation-Level`. (Còn `db.transaction()` thì ném
 * "No transactions support in neon-http driver".)
 *
 * Batch là non-interactive: không đọc được id ở giữa. Vì vậy `groupId` sinh
 * tường minh ở đây thay vì dựa vào `$defaultFn` của schema.
 *
 * Kiểu của `batch` là tuple `Readonly<[U, ...U[]]>` — truyền literal array,
 * đừng build bằng `.map()`.
 */
async function createWithAdmin(input: NewGroupWithAdmin): Promise<GroupSummary> {
  const db = getDb()
  const groupId = uuidv7()

  await db.batch([
    db.insert(groups).values({ id: groupId, name: input.name, timezone: input.timezone }),
    db
      .insert(groupMembers)
      .values({ groupId, userId: input.creatorUserId, isAdmin: true }),
  ])

  return { id: groupId, name: input.name, timezone: input.timezone }
}

async function listForUser(userId: string): Promise<GroupListItem[]> {
  const db = getDb()

  // `removed_at IS NULL` ở đây là câu hỏi "lấy dòng nào", không phải quyết định
  // phân quyền — phân quyền nằm ở `isActiveMembership`. Hai chỗ phải khớp nhau.
  const rows = await db
    .select({ id: groups.id, name: groups.name, timezone: groups.timezone })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(and(eq(groupMembers.userId, userId), isNull(groupMembers.removedAt)))
    .orderBy(desc(groupMembers.joinedAt))

  if (rows.length === 0) {
    return []
  }

  const counts = await db
    .select({ groupId: groupMembers.groupId, memberCount: count() })
    .from(groupMembers)
    .where(
      and(
        inArray(
          groupMembers.groupId,
          rows.map((row) => row.id),
        ),
        isNull(groupMembers.removedAt),
      ),
    )
    .groupBy(groupMembers.groupId)

  const countByGroupId = new Map(counts.map((row) => [row.groupId, row.memberCount]))

  return rows.map((row) => ({ ...row, memberCount: countByGroupId.get(row.id) ?? 0 }))
}

async function findById(groupId: string): Promise<GroupSummary | null> {
  const rows = await getDb()
    .select({ id: groups.id, name: groups.name, timezone: groups.timezone })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1)

  return rows[0] ?? null
}

/** KHÔNG lọc `removed_at`: guard cần phân biệt "chưa từng là member" với
 *  "đã bị gỡ" — xem `domain/membership.ts`. */
async function findMembership(groupId: string, userId: string): Promise<Membership | null> {
  const rows = await getDb()
    .select({ isAdmin: groupMembers.isAdmin, removedAt: groupMembers.removedAt })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1)

  return rows[0] ?? null
}

export const drizzleGroupRepository: GroupRepository = {
  createWithAdmin,
  listForUser,
  findById,
}

export const drizzleMembershipRepository: MembershipRepository = {
  findMembership,
}
```

Không unit test (Tech Spec §8.2). Chứng minh ở smoke test §11.

---

# 9. Component

## 9.1 `src/shared/ui/button.tsx` — mở rộng

S1 hardcode `w-full min-h-14 px-6 text-subtitle` vào `BASE_CLASSES`. S2 cần thêm ba cỡ và hai kiểu. **Mặc định không đổi → 4 test của S1 vẫn xanh.**

```tsx
import type { ButtonHTMLAttributes, ReactElement } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'quietAccent'
type ButtonSize = 'lg' | 'md' | 'sm'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Đang xử lý: giảm tương phản, khoá tương tác, KHÔNG đổi kích thước. */
  pending?: boolean
  /** Chưa đủ điều kiện: giảm tương phản nhưng VẪN bấm được, để bấm ra lỗi.
   *  Khác hẳn `pending` và khác hẳn `disabled`. */
  muted?: boolean
}

const BASE_CLASSES =
  'rounded-control font-semibold transition-transform duration-100 active:scale-[0.98] disabled:active:scale-100'

const SIZE_CLASSES: Record<ButtonSize, string> = {
  lg: 'w-full min-h-14 px-6 text-subtitle',
  md: 'min-h-12 px-6 py-3 text-body',
  sm: 'min-h-11 px-4 py-3 text-body',
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent shadow-button hover:bg-accent-hover active:bg-accent-active',
  secondary:
    'border border-border bg-surface-raised text-ink hover:border-border-strong hover:bg-surface active:bg-surface-sunken',
  quiet: 'bg-transparent text-ink-muted hover:bg-surface-sunken active:bg-border',
  quietAccent: 'bg-transparent text-accent hover:bg-surface-sunken active:bg-border',
}

// Design Criteria: "Nút không được đổi kích thước khi chuyển sang trạng thái
// đang xử lý." Chỉ màu đổi.
const PENDING_CLASSES = 'bg-surface-sunken text-ink-muted'
const MUTED_CLASSES = 'bg-surface-sunken text-ink-faint'

function toneClasses(variant: ButtonVariant, pending: boolean, muted: boolean): string {
  if (pending) return PENDING_CLASSES
  if (muted) return MUTED_CLASSES
  return VARIANT_CLASSES[variant]
}

export function Button({
  variant = 'primary',
  size = 'lg',
  pending = false,
  muted = false,
  className = '',
  children,
  ...rest
}: ButtonProps): ReactElement {
  return (
    <button
      {...rest}
      disabled={pending || rest.disabled === true}
      aria-busy={pending}
      className={`${BASE_CLASSES} ${SIZE_CLASSES[size]} ${toneClasses(variant, pending, muted)} ${className}`}
    >
      {children}
    </button>
  )
}
```

> `quietAccent` là variant riêng chứ không phải `className="text-accent"`: hai utility `text-ink-muted` và `text-accent` cùng specificity, cái nào thắng phụ thuộc vị trí trong stylesheet chứ không phải thứ tự trong attribute. Variant riêng là cách duy nhất chắc chắn.

Thêm vào `button.test.tsx`:

```tsx
it('size quiet không chiếm hết chiều ngang', () => {
  render(
    <Button variant="quiet" size="sm">
      Tôi có link mời
    </Button>,
  )
  expect(screen.getByRole('button')).not.toHaveClass('w-full')
})

it('muted vẫn bấm được — để bấm ra lỗi validation', () => {
  render(<Button muted>Tạo nhóm</Button>)
  expect(screen.getByRole('button')).toBeEnabled()
})
```

## 9.2 `src/shared/ui/skeleton.tsx`

```tsx
import type { ReactElement } from 'react'

/** Design Criteria: trạng thái tải dùng khung xương, KHÔNG dùng vòng quay. */
export function Skeleton({ className = '' }: { className?: string }): ReactElement {
  return (
    <span
      aria-hidden
      className={`block animate-skeleton rounded-control bg-surface-sunken ${className}`}
    />
  )
}
```

## 9.3 `src/shared/ui/text-field.tsx`

```tsx
import type { ReactElement } from 'react'
import { useId } from 'react'

export type TextFieldProps = {
  label: string
  name: string
  value: string
  placeholder: string
  /** `null` khi không có lỗi. Không dùng optional property —
   *  `exactOptionalPropertyTypes` cấm gán `undefined` vào nó. */
  error: string | null
  onChange: (value: string) => void
}

export function TextField({
  label,
  name,
  value,
  placeholder,
  error,
  onChange,
}: TextFieldProps): ReactElement {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-caption font-medium text-ink-muted">
        {label}
      </label>

      <input
        id={id}
        name={name}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error !== null}
        aria-describedby={error === null ? undefined : errorId}
        className={`min-h-12 w-full rounded-chip border bg-surface-raised px-4 py-3 text-body-lg text-ink placeholder:text-ink-faint ${
          error === null ? 'border-border' : 'border-danger'
        }`}
      />

      {/* Design Criteria: lỗi nằm ngay cạnh thứ gây ra lỗi, không dùng dialog. */}
      {error === null ? null : (
        <span id={errorId} className="text-caption font-medium text-danger">
          {error}
        </span>
      )}
    </div>
  )
}
```

> `aria-describedby={undefined}` là JSX prop, không phải object literal — `exactOptionalPropertyTypes` không áp dụng ở đây. Nếu `tsc` vẫn kêu, tách thành hai nhánh JSX.

`text-field.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TextField } from './text-field'

describe('TextField', () => {
  it('không lỗi thì không có thông báo nào', () => {
    render(
      <TextField
        label="Tên nhóm"
        name="name"
        value=""
        placeholder="Ví dụ: Nhà Bảy Hiền"
        error={null}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Tên nhóm')).toHaveAttribute('aria-invalid', 'false')
  })

  it('có lỗi thì hiện ngay dưới input và nối bằng aria-describedby', () => {
    render(
      <TextField
        label="Tên nhóm"
        name="name"
        value=""
        placeholder="Ví dụ: Nhà Bảy Hiền"
        error="Đặt tên để cả nhà nhận ra nhóm."
        onChange={vi.fn()}
      />,
    )

    const input = screen.getByLabelText('Tên nhóm')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Đặt tên để cả nhà nhận ra nhóm.')).toBeInTheDocument()
    expect(input).toHaveAccessibleDescription('Đặt tên để cả nhà nhận ra nhóm.')
  })
})
```

## 9.4 `src/shared/ui/empty-state-card.tsx`

```tsx
import type { ReactElement, ReactNode } from 'react'

export type EmptyStateCardProps = {
  title: string
  description: string
  children?: ReactNode
}

/**
 * Design Handoff: một câu nêu tình trạng + một câu nêu việc cần làm. Không
 * minh hoạ, không icon.
 */
export function EmptyStateCard({ title, description, children }: EmptyStateCardProps): ReactElement {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-raised p-6">
      <h2 className="text-pretty text-title font-semibold text-ink">{title}</h2>
      <p className="text-pretty text-body-lg font-normal text-ink-muted">{description}</p>
      {children}
    </div>
  )
}
```

## 9.5 `src/shared/ui/sheet.tsx`

```tsx
'use client'

import type { KeyboardEvent, ReactElement, ReactNode } from 'react'
import { useCallback, useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export type SheetProps = {
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Design Handoff: biểu mẫu dùng sheet trượt từ đáy, KHÔNG modal giữa màn hình.
 * Bo `20px 20px 0 0`, scrim `rgba(28,25,23,.28)`, `max-height: 88%`, focus bị
 * giữ bên trong.
 *
 * KHÔNG dùng `<dialog showModal>`: jsdom 30 không hiện thực `showModal`
 * (`HTMLDialogElement-impl.js` là class rỗng), nên mọi test chạm sheet sẽ nổ.
 */
export function Sheet({ title, onClose, children }: SheetProps): ReactElement {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
    return () => previouslyFocused?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') {
        return
      }

      const panel = panelRef.current
      if (panel === null) {
        return
      }

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      const first = items[0]
      const last = items.at(-1)
      if (first === undefined || last === undefined) {
        return
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Scrim là <button> chứ không phải <div onClick>: bấm ra ngoài để đóng
          phải dùng được bằng bàn phím, và jsx-a11y không phải kêu. */}
      <button type="button" aria-label="Đóng" onClick={onClose} className="absolute inset-0 bg-scrim" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={handleKeyDown}
        className="relative flex max-h-[88%] w-full max-w-app flex-col gap-4 rounded-t-card bg-surface-raised p-6 shadow-lift"
      >
        {children}
      </div>
    </div>
  )
}
```

`sheet.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Sheet } from './sheet'

describe('Sheet', () => {
  it('Escape đóng sheet', async () => {
    const onClose = vi.fn()
    render(
      <Sheet title="Chọn múi giờ" onClose={onClose}>
        <button type="button">Một</button>
      </Sheet>,
    )

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('bấm ra ngoài đóng sheet', async () => {
    const onClose = vi.fn()
    render(
      <Sheet title="Chọn múi giờ" onClose={onClose}>
        <button type="button">Một</button>
      </Sheet>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('focus rơi vào phần tử đầu tiên bên trong và Tab quay vòng', async () => {
    render(
      <Sheet title="Chọn múi giờ" onClose={vi.fn()}>
        <button type="button">Một</button>
        <button type="button">Hai</button>
      </Sheet>,
    )

    expect(screen.getByRole('button', { name: 'Một' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Hai' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Một' })).toHaveFocus()
  })
})
```

---

# 10. Màn hình

## 10.1 `src/features/group/presentation/components/group-card.tsx`

```tsx
import Link from 'next/link'
import type { ReactElement } from 'react'

export type GroupCardProps = {
  id: string
  name: string
  status: string
  meta: string
}

/**
 * Thẻ nhóm ở S-02. Prototype vẽ nó là `<button>`, nhưng đây là điều hướng nên
 * dùng `<Link>` — người dùng mở tab mới được, và screen reader đọc đúng vai trò.
 *
 * Chấm `--accent` "có phiên đang chạy" và số món CỐ Ý chưa có: bảng
 * `selection_sessions` và `group_dishes` chưa tồn tại ở slice này, và bịa số
 * liệu là cách nhanh nhất để mất lòng tin. E1-T5/E1-T7 nối vào.
 */
export function GroupCard({ id, name, status, meta }: GroupCardProps): ReactElement {
  return (
    <Link
      href={`/groups/${id}`}
      className="flex flex-col items-stretch gap-2 rounded-control border border-border bg-surface-raised p-4 text-left hover:border-border-strong active:bg-surface-sunken"
    >
      <span className="text-subtitle font-semibold text-ink">{name}</span>
      <span className="text-pretty text-body font-normal text-ink-muted">{status}</span>
      <span className="text-caption font-medium tabular-nums text-ink-muted">{meta}</span>
    </Link>
  )
}
```

> Nếu `typedRoutes` không chịu template literal, đổi thành `href={{ pathname: '/groups/[groupId]', query: { groupId: id } }}` hoặc thêm `import type { Route } from 'next'` rồi `` href={`/groups/${id}` as Route} ``. Thử cách đơn giản trước.

## 10.2 `src/features/group/presentation/components/group-list-screen.tsx` — S-02

```tsx
import Link from 'next/link'
import type { ReactElement } from 'react'

import { Button } from '@/shared/ui/button'
import { EmptyStateCard } from '@/shared/ui/empty-state-card'

import { GroupCard } from './group-card'

export type GroupListItemView = {
  id: string
  name: string
  status: string
  meta: string
}

export type GroupListScreenProps = {
  dateCaption: string
  groups: GroupListItemView[]
}

export function GroupListScreen({ dateCaption, groups }: GroupListScreenProps): ReactElement {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex flex-col gap-1 px-4 pb-3 pt-6">
        <span className="text-caption font-medium text-ink-muted">{dateCaption}</span>
        <h1 className="text-title font-semibold text-ink">Nhóm của bạn</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto px-4 pb-2 pt-3">
        {groups.length === 0 ? (
          <EmptyStateCard
            title="Bạn chưa có nhóm nào."
            description="Tạo một nhóm cho nhà mình, rồi mời từng người bằng link."
          />
        ) : (
          groups.map((group) => <GroupCard key={group.id} {...group} />)
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-4 pb-8 pt-4">
        <Link href="/groups/new" className="contents">
          <Button type="button">Tạo nhóm</Button>
        </Link>
        {/* E2-T2: "Tôi có link mời" bật lên khi SPEC-004 có màn hình. */}
      </div>
    </main>
  )
}
```

> `<Link className="contents"><Button>` lồng `<a>` quanh `<button>` là HTML không hợp lệ. Cách đúng: cho `Button` nhận `asChild`, hoặc đơn giản hơn — dùng `<Link>` được style **giống** primary button. Chọn cách thứ hai:

```tsx
<Link
  href="/groups/new"
  className="flex min-h-14 w-full items-center justify-center rounded-control bg-accent px-6 text-subtitle font-semibold text-on-accent shadow-button transition-transform duration-100 hover:bg-accent-hover active:scale-[0.98] active:bg-accent-active"
>
  Tạo nhóm
</Link>
```

`group-list-screen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GroupListScreen } from './group-list-screen'

describe('S-02 Danh sách nhóm', () => {
  it('chưa có nhóm nào thì nêu tình trạng và việc cần làm', () => {
    render(<GroupListScreen dateCaption="Thứ Ba · 18 tháng 8" groups={[]} />)

    expect(screen.getByText('Bạn chưa có nhóm nào.')).toBeInTheDocument()
    expect(
      screen.getByText('Tạo một nhóm cho nhà mình, rồi mời từng người bằng link.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tạo nhóm' })).toBeInTheDocument()
  })

  it('có nhóm thì hiện thẻ và không còn empty state', () => {
    render(
      <GroupListScreen
        dateCaption="Thứ Ba · 18 tháng 8"
        groups={[
          { id: 'g1', name: 'Nhà Bảy Hiền', status: 'Chưa mở phiên hôm nay', meta: '4 người' },
        ]}
      />,
    )

    expect(screen.getByRole('link', { name: /Nhà Bảy Hiền/ })).toBeInTheDocument()
    expect(screen.queryByText('Bạn chưa có nhóm nào.')).not.toBeInTheDocument()
  })
})
```

## 10.3 `time-zone-picker-sheet.tsx` và `time-zone-field.tsx`

```tsx
'use client'

import type { ReactElement } from 'react'
import { useMemo, useState } from 'react'

import { Sheet } from '@/shared/ui/sheet'
import { canonicalTimeZone } from '@/shared/time/time-zone'

/** Dự phòng khi trình duyệt chưa có `Intl.supportedValuesOf` (Chrome <99,
 *  Safari <15.4). Đủ để không ai bị kẹt. */
const FALLBACK_TIME_ZONES = [
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
]

export type TimeZonePickerSheetProps = {
  selected: string
  onSelect: (timeZone: string) => void
  onClose: () => void
}

export function TimeZonePickerSheet({
  selected,
  onSelect,
  onClose,
}: TimeZonePickerSheetProps): ReactElement {
  const [query, setQuery] = useState('')

  // Gọi ở CLIENT và chỉ khi sheet mở: danh sách 418 mục nặng ~7.7 KB JSON, mà
  // trình duyệt đã có sẵn miễn phí. Nhét nó vào RSC payload là trả tiền hai lần.
  const timeZones = useMemo(
    () =>
      typeof Intl.supportedValuesOf === 'function'
        ? Intl.supportedValuesOf('timeZone')
        : FALLBACK_TIME_ZONES,
    [],
  )

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle === '' ? timeZones : timeZones.filter((zone) => zone.toLowerCase().includes(needle))
  }, [query, timeZones])

  // So khớp theo dạng canonical: Firefox báo 'Asia/Ho_Chi_Minh' còn danh sách
  // chỉ có 'Asia/Saigon' — không canonical hoá thì KHÔNG mục nào được đánh dấu.
  const selectedCanonical = canonicalTimeZone(selected)

  return (
    <Sheet title="Chọn múi giờ" onClose={onClose}>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm múi giờ"
        aria-label="Tìm múi giờ"
        className="min-h-12 w-full rounded-chip border border-border bg-surface-raised px-4 py-3 text-body-lg text-ink placeholder:text-ink-faint"
      />

      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto">
        {visible.map((zone) => (
          <li key={zone}>
            <button
              type="button"
              aria-current={zone === selectedCanonical}
              onClick={() => onSelect(zone)}
              className={`min-h-11 w-full rounded-control px-4 py-3 text-left text-body ${
                zone === selectedCanonical
                  ? 'bg-accent-soft font-semibold text-accent'
                  : 'font-normal text-ink hover:bg-surface-sunken'
              }`}
            >
              {zone.replaceAll('_', ' ')}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
```

```tsx
'use client'

import type { ReactElement } from 'react'
import { useState } from 'react'

import { formatTimeZoneLabel } from '@/shared/time/time-zone'
import { Button } from '@/shared/ui/button'

import { TimeZonePickerSheet } from './time-zone-picker-sheet'

export type TimeZoneFieldProps = {
  value: string
  onChange: (timeZone: string) => void
}

export function TimeZoneField({ value, onChange }: TimeZoneFieldProps): ReactElement {
  const [isPickerOpen, setPickerOpen] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption font-medium text-ink-muted">Múi giờ</span>

      <div className="flex min-h-14 items-center justify-between gap-3 rounded-control border border-border bg-surface-raised p-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-subtitle font-semibold text-ink">
            {formatTimeZoneLabel(value, new Date())}
          </span>
          <span className="text-caption font-medium text-ink-muted">Theo điện thoại của bạn</span>
        </span>

        <Button type="button" variant="quietAccent" size="sm" onClick={() => setPickerOpen(true)}>
          Đổi
        </Button>
      </div>

      <span className="text-pretty text-caption font-medium text-ink-muted">
        Múi giờ quyết định phiên chọn món đóng lúc nào cuối ngày.
      </span>

      {/* Server validate lại bằng readGroupDraft, nên giá trị này không phải
          nguồn tin cậy — chỉ là tiện lợi. */}
      <input type="hidden" name="timezone" value={value} />

      {isPickerOpen ? (
        <TimeZonePickerSheet
          selected={value}
          onClose={() => setPickerOpen(false)}
          onSelect={(timeZone) => {
            onChange(timeZone)
            setPickerOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
```

## 10.4 `create-group-form.tsx` — S-03

```tsx
'use client'

import Link from 'next/link'
import type { ReactElement } from 'react'
import { useActionState, useEffect, useState } from 'react'

import { isValidTimeZone } from '@/shared/time/time-zone'
import { Button } from '@/shared/ui/button'
import { TextField } from '@/shared/ui/text-field'

import { TimeZoneField } from './time-zone-field'

export type CreateGroupFormState = {
  readonly nameError: string | null
}

export const CREATE_GROUP_INITIAL_STATE: CreateGroupFormState = { nameError: null }

export type CreateGroupFormProps = {
  action: (state: CreateGroupFormState, formData: FormData) => Promise<CreateGroupFormState>
  /** Múi giờ server đoán trước. Client sẽ ghi đè bằng múi giờ thật của máy
   *  ngay sau khi mount — với người dùng ở Việt Nam hai giá trị trùng nhau nên
   *  không thấy nháy. */
  initialTimeZone: string
}

export function CreateGroupForm({ action, initialTimeZone }: CreateGroupFormProps): ReactElement {
  const [state, formAction, pending] = useActionState(action, CREATE_GROUP_INITIAL_STATE)
  const [name, setName] = useState('')
  const [timeZone, setTimeZone] = useState(initialTimeZone)

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (isValidTimeZone(detected)) {
      setTimeZone(detected)
    }
  }, [])

  return (
    <form action={formAction} className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-6">
        <h1 className="text-title font-semibold text-ink">Tạo nhóm</h1>
        <Link
          href="/groups"
          className="-mr-3 flex min-h-11 items-center rounded-control px-3 text-body font-semibold text-ink-muted hover:bg-surface-sunken"
        >
          Huỷ
        </Link>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-4 pt-3">
        <TextField
          label="Tên nhóm"
          name="name"
          value={name}
          placeholder="Ví dụ: Nhà Bảy Hiền"
          error={state.nameError}
          onChange={setName}
        />
        <TimeZoneField value={timeZone} onChange={setTimeZone} />
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8 pt-4">
        {/* `muted` chứ không `disabled`: prototype cho bấm khi tên trống để
            hiện lỗi. Nút disabled không nói được vì sao nó disabled. */}
        <Button type="submit" pending={pending} muted={name.trim() === ''}>
          {pending ? 'Đang tạo…' : 'Tạo nhóm'}
        </Button>
        <span className="self-center text-caption font-medium text-ink-muted">
          Bạn sẽ là người quản lý nhóm này
        </span>
      </div>
    </form>
  )
}
```

`create-group-form.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { CreateGroupFormState } from './create-group-form'
import { CreateGroupForm } from './create-group-form'

async function noopAction(state: CreateGroupFormState): Promise<CreateGroupFormState> {
  return state
}

async function failingAction(): Promise<CreateGroupFormState> {
  return { nameError: 'Đặt tên để cả nhà nhận ra nhóm.' }
}

describe('S-03 Tạo nhóm', () => {
  it('nút Tạo nhóm mờ khi tên trống nhưng vẫn bấm được', () => {
    render(<CreateGroupForm action={noopAction} initialTimeZone="Asia/Ho_Chi_Minh" />)
    expect(screen.getByRole('button', { name: 'Tạo nhóm' })).toBeEnabled()
  })

  it('hiện múi giờ dạng người đọc được', () => {
    render(<CreateGroupForm action={noopAction} initialTimeZone="Asia/Ho_Chi_Minh" />)
    expect(screen.getByText('Việt Nam · GMT+7')).toBeInTheDocument()
  })

  it('action trả lỗi thì hiện dưới input và giữ nguyên tên đã gõ', async () => {
    render(<CreateGroupForm action={failingAction} initialTimeZone="Asia/Ho_Chi_Minh" />)

    await userEvent.type(screen.getByLabelText('Tên nhóm'), 'Nhà Bảy Hiền')
    await userEvent.click(screen.getByRole('button', { name: 'Tạo nhóm' }))

    expect(await screen.findByText('Đặt tên để cả nhà nhận ra nhóm.')).toBeInTheDocument()
    expect(screen.getByLabelText('Tên nhóm')).toHaveValue('Nhà Bảy Hiền')
  })
})
```

## 10.5 `group-overview-screen.tsx` — S-04 vỏ rỗng

```tsx
import Link from 'next/link'
import type { ReactElement } from 'react'

import { EmptyStateCard } from '@/shared/ui/empty-state-card'

const DISH_EXAMPLES = ['Cá basa kho tiêu', 'Canh chua cá lóc', 'Gà chiên nước mắm']

export type GroupOverviewScreenProps = {
  groupName: string
  dateCaption: string
}

/**
 * S-04 ở trạng thái rỗng. CỐ Ý chưa có: ba hàng lối tắt (Danh mục món / Quy
 * định bữa ăn / Thành viên), CTA "Thêm món đầu tiên", nút "Nhóm" ở góc — cả bốn
 * dẫn tới màn hình chưa tồn tại. Nút bấm không làm gì tệ hơn không có nút.
 *
 * E1-T5: thay khối dưới bằng ba hàng lối tắt + CTA "Thêm món đầu tiên".
 */
export function GroupOverviewScreen({
  groupName,
  dateCaption,
}: GroupOverviewScreenProps): ReactElement {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex flex-col gap-1 px-4 pb-3 pt-6">
        <span className="text-caption font-medium text-ink-muted">{dateCaption}</span>
        <h1 className="text-title font-semibold text-ink">{groupName}</h1>
      </header>

      <div className="flex-1 px-4 pt-3">
        <EmptyStateCard
          title="Trước tiên hãy thêm vài món nhà bạn hay ăn."
          description="Chưa có món thì chưa mở phiên chọn được. Khoảng 15–20 món là đủ để bắt đầu."
        >
          <hr className="border-border" />
          <span className="text-caption font-medium text-ink-muted">
            Cứ viết như cách cả nhà gọi tên
          </span>
          {DISH_EXAMPLES.map((example) => (
            <span key={example} className="text-body-lg font-normal text-ink-faint">
              {example}
            </span>
          ))}
        </EmptyStateCard>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8 pt-4">
        <Link
          href="/groups"
          className="flex min-h-11 items-center justify-center self-center rounded-control px-4 text-body font-semibold text-ink-muted hover:bg-surface-sunken"
        >
          Nhóm của bạn
        </Link>
      </div>
    </main>
  )
}
```

---

# 11. Route

## 11.1 `src/app/groups/page.tsx` — viết lại

```tsx
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { listGroups } from '@/features/group/application/list-groups'
import { drizzleGroupRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import { GroupListScreen } from '@/features/group/presentation/components/group-list-screen'
import { resolveDecisionDate } from '@/features/session/domain/decision-date'
import { DISPLAY_TIME_ZONE_FALLBACK } from '@/shared/time/time-zone'
import { formatVietnameseDate } from '@/shared/time/format-vietnamese-date'

export default async function GroupsPage() {
  const user = await getCurrentUser()
  if (user === null) {
    redirect('/')
  }

  const groups = await listGroups({ groups: drizzleGroupRepository }, user.id)

  // Trang này không có Group context nên dùng fallback CHỈ để hiển thị.
  const today = resolveDecisionDate(new Date(), DISPLAY_TIME_ZONE_FALLBACK)

  return (
    <GroupListScreen
      dateCaption={formatVietnameseDate(today)}
      groups={groups.map((group) => ({
        id: group.id,
        name: group.name,
        // E1-T7 thay bằng trạng thái phiên thật. Không bịa số liệu ở đây.
        status: 'Chưa mở phiên hôm nay',
        meta: `${group.memberCount} người`,
      }))}
    />
  )
}
```

## 11.2 `src/app/groups/loading.tsx`

```tsx
import { Skeleton } from '@/shared/ui/skeleton'

/** Design Handoff S-02: hai khung xương 96px, khối thứ hai lệch pha .15s.
 *  Không vòng quay. */
export default function GroupsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-app flex-col gap-2 px-4 pt-24">
      <Skeleton className="h-24" />
      <Skeleton className="h-24 [animation-delay:150ms]" />
    </div>
  )
}
```

## 11.3 `src/app/groups/error.tsx`

```tsx
'use client'

import { Banner } from '@/shared/ui/banner'
import { Button } from '@/shared/ui/button'

/** S-02 trạng thái lỗi. Dùng `error.tsx` của Next thay vì tự dựng state:
 *  `retry()` chính là nút "Thử lại" của thiết kế.
 *
 *  Prop là `retry`, KHÔNG phải `reset` — `retry` stable từ Next 16.3.0
 *  (`03-file-conventions/error.md`). `reset()` chỉ xoá trạng thái lỗi rồi render
 *  lại dữ liệu CŨ, không nạp lại; đó không phải nghĩa "Thử lại" của thiết kế. */
export default function GroupsError({ retry }: { error: Error; retry: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-app flex-col gap-3 px-4 pt-24">
      <Banner tone="danger">Không tải được danh sách nhóm.</Banner>
      <Button type="button" variant="secondary" size="md" className="self-start" onClick={retry}>
        Thử lại
      </Button>
    </div>
  )
}
```

## 11.4 `src/app/groups/new/page.tsx`

```tsx
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { CreateGroupForm } from '@/features/group/presentation/components/create-group-form'
import { DISPLAY_TIME_ZONE_FALLBACK } from '@/shared/time/time-zone'

import { createGroupAction } from '../actions'

export default async function NewGroupPage() {
  const user = await getCurrentUser()
  if (user === null) {
    redirect('/')
  }

  return <CreateGroupForm action={createGroupAction} initialTimeZone={DISPLAY_TIME_ZONE_FALLBACK} />
}
```

## 11.5 `src/app/groups/actions.ts`

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { createGroup } from '@/features/group/application/create-group'
import { drizzleGroupRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import type { CreateGroupFormState } from '@/features/group/presentation/components/create-group-form'
import type { Failure } from '@/shared/errors'

// E6-T2 chuyển bảng này sang `shared/errors/messages.ts`. Ở đây chỉ có đúng
// những câu S-03 cần.
function toVietnameseMessage(error: Failure): string {
  if (error.details?.['field'] === 'name') {
    return 'Đặt tên để cả nhà nhận ra nhóm.'
  }
  return 'Không tạo được nhóm. Thử lại giúp mình.'
}

/**
 * Lắp ráp cho SPEC-002 — không chứa business logic.
 *
 * Đặt ở `app/` chứ không trong `features/group/`: ESLint chặn `group` import
 * `auth` (CROSS_FEATURE_ZONES), mà action phải tự đọc session. Đây đúng là chỗ
 * mà comment trong `eslint.config.mjs` nói tới.
 */
export async function createGroupAction(
  _previousState: CreateGroupFormState,
  formData: FormData,
): Promise<CreateGroupFormState> {
  // Server Action gọi được bằng POST trực tiếp, không chỉ qua UI.
  const user = await getCurrentUser()
  if (user === null) {
    redirect('/')
  }

  const result = await createGroup(
    { groups: drizzleGroupRepository },
    {
      creatorUserId: user.id,
      name: String(formData.get('name') ?? ''),
      timezone: String(formData.get('timezone') ?? ''),
    },
  )

  if (!result.ok) {
    return { nameError: toVietnameseMessage(result.error) }
  }

  // `/groups` là dynamic nên không dính Full Route Cache, nhưng client Router
  // Cache thì có — dọn trước khi điều hướng.
  revalidatePath('/groups')

  // `redirect` hoạt động bằng cách throw. Phải là câu lệnh cuối, ngoài try/catch.
  redirect(`/groups/${result.value.id}`)
}
```

## 11.6 `src/app/groups/[groupId]/page.tsx`

```tsx
import { notFound, redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { assertGroupAccess } from '@/features/group/application/assert-group-access'
import {
  drizzleGroupRepository,
  drizzleMembershipRepository,
} from '@/features/group/infrastructure/drizzle-group-repository'
import { GroupOverviewScreen } from '@/features/group/presentation/components/group-overview-screen'
import { resolveDecisionDate } from '@/features/session/domain/decision-date'
import { formatVietnameseDate } from '@/shared/time/format-vietnamese-date'

// Khai kiểu thủ công, KHÔNG dùng helper `PageProps<'/groups/[groupId]'>` — nó do
// `next typegen` sinh vào `.next/types`, mà CI chạy `typecheck` trước `build`.
type GroupPageProps = {
  params: Promise<{ groupId: string }>
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { groupId } = await params

  const user = await getCurrentUser()
  if (user === null) {
    redirect('/')
  }

  // Tech Spec §5: guard chạy TRƯỚC business logic.
  const access = await assertGroupAccess(
    { memberships: drizzleMembershipRepository },
    { userId: user.id, groupId, requiredRole: 'MEMBER' },
  )

  // `notFound()` chứ không `forbidden()`: (a) `forbidden()` cần
  // `experimental.authInterrupts`; (b) NFR-04 — không lộ nhóm này có tồn tại hay không.
  if (!access.ok) {
    notFound()
  }

  const group = await drizzleGroupRepository.findById(groupId)
  if (group === null) {
    notFound()
  }

  // SPEC-018 chạy production lần đầu — header phải theo timezone của NHÓM,
  // không phải của server.
  const decisionDate = resolveDecisionDate(new Date(), group.timezone)

  return (
    <GroupOverviewScreen
      groupName={group.name}
      dateCaption={formatVietnameseDate(decisionDate)}
    />
  )
}
```

---

# 12. Cấu hình phải sửa

| File | Sửa gì |
|---|---|
| `src/app/globals.css` | thêm `--color-scrim` và `--animate-skeleton` + `@keyframes skeleton` (§5.1) |
| `src/shared/db/schema.ts` | thêm `groups`, `groupMembers`; import thêm `boolean`, `index` |
| migrations | `yarn db:generate --name=group_and_members` — không sửa tay |
| `knip.jsonc` | **xoá** dòng `"src/features/session/domain/decision-date.ts"` và comment "GỠ Ở E1-T4" |
| `src/shared/testing/factories.ts` | thêm `makeGroup`, `makeMembership` |
| `vitest.config.mts` | `coverage.include` thêm `'src/shared/time/**/*.ts'` — `time-zone.ts` có đúng hồ sơ "sai mà không gây lỗi" của Tech Spec §8.2 mà hiện nằm ngoài mọi ngưỡng |
| `docs/..._decision-log_v1.1.md` | 3 mục: (a) `db.batch` là transaction thật của neon-http, `db.transaction` thì không — E1-T7 sẽ cần driver WebSocket; (b) canonical hoá timezone khi lưu, kèm lý do `supportedValuesOf` không chứa `Asia/Ho_Chi_Minh`; (c) `DISPLAY_TIME_ZONE_FALLBACK` chỉ dùng để hiển thị |
| `docs/..._master-plan_v1_0.md` | tick E1-T2, E1-T3, E1-T4 |

**Không sửa**: `drizzle.config.ts`, `.jscpd.json`, `eslint.config.mjs`, `next.config.ts`, `package.json` (**không thêm dependency nào**), `.github/workflows/ci.yml`, `.prettierignore`.

---

# 13. Thứ tự thực hiện (TDD)

Nhánh `feat/group-minimum`. Conventional Commits, scope `group` / `shared` / `ui` / `db` / `app`.

| # | Việc | Test viết TRƯỚC | Tick |
|---|---|---|---|
| 0 | `yarn verify && yarn arch:probe && yarn build` xanh trên baseline S1 | — | |
| 1 | `shared/time/time-zone.ts` | **`time-zone.test.ts` ĐỎ trước** (§5.2) | |
| 2 | Refactor `decision-date.ts` dùng `isValidTimeZone` | **7 test cũ vẫn xanh, KHÔNG sửa file test** | |
| 3 | `shared/time/format-vietnamese-date.ts` | **ĐỎ trước** (§5.3) | |
| 4 | `group/domain/{group-draft,membership}.ts` | **ĐỎ trước** (§6.1, §6.2) | |
| 5 | `schema.ts` → `yarn db:generate --name=group_and_members` → `yarn db:migrate` | đọc `.sql` sinh ra, đối chiếu Tech Spec §3.1 | |
| 6 | port `group-repository.ts` + `create-group.ts` + factories | **`create-group.test.ts` ĐỎ trước — acceptance của E1-T2** | **E1-T2** |
| 7 | port `membership-repository.ts` + `assert-group-access.ts` | **`assert-group-access.test.ts` ĐỎ trước** | **E1-T3** |
| 8 | `list-groups.ts` | **ĐỎ trước** (§7.5) | |
| 9 | `drizzle-group-repository.ts` | không unit test (Tech Spec §8.2) | |
| 10 | `shared/ui`: `button` (sửa), `skeleton`, `text-field`, `empty-state-card`, `sheet` | **ĐỎ trước.** 4 test Button của S1 phải vẫn xanh | |
| 11 | `group/presentation/components/*` | **ĐỎ trước** (§10) | |
| 12 | `app/groups/**` | không unit test; kiểm ở §14. Đây là chỗ `resolveDecisionDate` chạy production | **E1-T4** |
| 13 | `knip.jsonc`, `vitest.config.mts`, `globals.css`, decision log, master plan | `yarn verify && yarn arch:probe && yarn build` | |
| 14 | Smoke thủ công (§14) → PR | | |

Sau bước 7: `yarn test:coverage` — `create-group.ts`, `assert-group-access.ts`, `group-draft.ts` phải ≥80% dòng.

---

# 14. Verify

## 14.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn build
```

`yarn test` phải in ra `TC-004`, `TC-005`, `TC-006`, `TC-006b`, `TC-007`, `TC-008`, `TC-009`, `TC-010`. Đính output vào PR.

## 14.2 Local, DevTools 390×844

```bash
yarn db:migrate
yarn dev
```

1. `/groups` → S-02 **rỗng**, header đúng ngày hôm nay dạng `Thứ … · N tháng M`. Đối chiếu từng con số với prototype dòng 52–100.
2. "Tạo nhóm" → `/groups/new` = S-03. Hàng múi giờ hiện **`Việt Nam · GMT+7`** + "Theo điện thoại của bạn". Nút "Tạo nhóm" nền `--surface-sunken`, chữ `--ink-faint`, **vẫn bấm được**.
3. Bấm khi ô tên trống → `Đặt tên để cả nhà nhận ra nhóm.` hiện dưới input, viền input chuyển `--danger`.
4. Gõ `Nhà Bảy Hiền` → nút chuyển `--accent`. Bấm → nhãn `Đang tạo…`, **kích thước không đổi** → sang `/groups/<uuid>` = S-04 rỗng.
5. **`yarn db:studio`** → `groups`: 1 dòng, **`timezone = 'Asia/Saigon'`** (đã canonical hoá). `group_members`: 1 dòng, `user_id` khớp `users.id`, **`is_admin = true`**, `removed_at = NULL` → **bằng chứng TC-008 ở tầng thật**.
6. Quay lại `/groups` → đúng 1 thẻ, meta `1 người`, **không** chấm accent, trạng thái `Chưa mở phiên hôm nay`. Không có số món bịa.
7. Bấm "Đổi" ở S-03 → Sheet trượt từ đáy, `Asia/Saigon` được đánh dấu; gõ `tokyo` lọc còn 1 mục; chọn → hàng đổi thành `Nhật Bản · GMT+9`. `Esc` đóng, focus quay về nút "Đổi".
8. **Bằng chứng SPEC-019 chạy thật**: trong `db:studio` đặt `group_members.removed_at = now()` → refresh `/groups/<uuid>` → ra 404, **không lộ tên nhóm**. Rồi `SET removed_at = NULL` để khôi phục.
9. Cửa sổ ẩn danh → `/groups/<uuid>` → đẩy về `/`.

## 14.3 Chỗ chỉ chứng minh được bằng unit test — nói thẳng trong PR

**TC-007 (`ERR_NOT_GROUP_ADMIN`) không có màn hình nào chứng minh được ở S2.** Thao tác đầu tiên yêu cầu Admin là SPEC-003 "Tạo link mời", thuộc **E2-T1**. Ở S2 mọi chỗ gọi guard đều `requiredRole: 'MEMBER'`, nên nhánh `ADMIN` là mã chưa có người gọi ở production.

Bằng chứng của TC-007 là `yarn test` xanh. **Ghi câu này vào mô tả PR** để reviewer không tưởng đã kiểm thủ công.

`knip --production` không báo, vì `assertGroupAccess` (cả hàm) có người gọi — knip không xét tới mức nhánh `if`.

## 14.4 Preview Vercel

Env scope Preview: `DATABASE_URL` trỏ Neon branch của PR. Migration chạy trong bước build. Chạy lại kịch bản 1–6 **trên điện thoại thật** (Setup Guide §5.1) — đây cũng là lần đầu kiểm `Intl.DateTimeFormat().resolvedOptions().timeZone` trên trình duyệt di động thật; cả `Asia/Saigon` lẫn `Asia/Ho_Chi_Minh` đều phải chạy đúng.

---

# 15. Rủi ro

| Rủi ro | Dấu hiệu | Làm gì |
|---|---|---|
| Ai đó "tối ưu" `isValidTimeZone` thành `supportedValuesOf().includes()` | Tạo nhóm với `Asia/Ho_Chi_Minh` bị từ chối | Test ở §5.2 khẳng định thẳng điều này, kèm comment giải thích tại chỗ |
| `Intl.supportedValuesOf` thiếu ở trình duyệt cũ (**chưa verify trên mobile**) | Sheet trống | Đã có guard `typeof … === 'function'` + `FALLBACK_TIME_ZONES` |
| 418 timezone làm nặng payload (~7.7 KB JSON) | RSC payload phình | Gọi ở **client**, lazy trong `useMemo` khi sheet mở. Payload thêm: 0 byte |
| `db.batch` cần tuple ≥1 phần tử | `tsc`: "not assignable to tuple" | Truyền literal array 2 phần tử, không `.map()`, không gán qua biến `X[]` |
| knip báo `decision-date.ts` sau khi gỡ ignore | `yarn knip` đỏ | Nghĩa là bước 12 chưa gọi `resolveDecisionDate` trong page. Sửa page, **đừng** thêm lại ignore |
| knip báo `Skeleton` là mã chết | `yarn knip` đỏ | `Skeleton` chỉ có chỗ dùng ở `app/groups/loading.tsx` — bỏ file đó thì phải bỏ luôn component |
| jscpd đỏ vì `/groups` và `/groups/[groupId]` cùng khung `getCurrentUser` + `redirect` | `yarn dup` ≥3% | Xác suất thấp (dưới `minTokens: 50`). Nếu đỏ: tách `requireCurrentUser()` vào `features/auth/infrastructure/session.ts`, **không** hạ threshold |
| `typedRoutes` không chịu `` href={`/groups/${id}`} `` | `tsc` đỏ ở `group-card.tsx` | Xem ghi chú §10.1 |
| `redirect()` bị `try/catch` nuốt trong action | Người dùng kẹt ở form, không lỗi nào | `redirect` là câu lệnh cuối, không có `try` bao quanh |
| Migration `0001` conflict `_journal.json` | merge conflict | Sinh migration ở commit riêng, cuối cùng, ngay trước khi mở PR |
| Node mặc định trên máy là v22 nhưng `.nvmrc` = 24 | "chạy được ở máy tôi" | `nvm use` trước mọi lệnh. (Đã kiểm: `Intl` cho kết quả giống nhau trên ICU 77 và 78) |
| `useEffect` đổi timezone gây nháy ở người dùng ngoài Việt Nam | caption đổi sau khi tải | Chấp nhận có ý thức: đó là một caption 13px, và thiết kế đã nói "Theo điện thoại của bạn". Người dùng mục tiêu ở Việt Nam thấy hai giá trị trùng nhau |
