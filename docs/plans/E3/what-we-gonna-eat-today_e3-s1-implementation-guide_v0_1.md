# 🚦 Implementation Guide — E3 Slice S1: Bắt đầu phiên

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-19`
> - **Upstream:** [Master Plan](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E3-T1`, `E3-T2`) • [SDD](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-008`) • [Business Rules](../../what-we-gonna-eat-today_business-rules_v1.8.md) (`BR-021`, `BR-025`) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-030→035`) • Mockup `docs/designs/designs/S-07 S-08 Quy dinh va Mo phien.dc.html`
> - **Tiền đề:** `E1-T7` đã code (`startSession` rút gọn). Slice này **sửa** chữ ký của nó — chưa route nào gọi nên an toàn.
>
> 🚦 *Slice đầu tiên của E3. Cơ chế bắt đầu phiên: revalidate 4 bước + hiện lỗi đúng tại hàng. Nối dây tạo/bắt đầu phiên vào `app/` lần đầu tiên.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | --- | --- | --- |
| `E3-T1` | Revalidate 4 bước lúc Start | 3 | `src/features/session/application/start-session.ts` | Dừng ở lỗi đầu tiên, trả đúng mã lỗi tương ứng từng bước |
| `E3-T2` | Hiện Participant không hợp lệ ngay tại hàng | 1 | `src/features/session/presentation/**` | Thấy tên người cụ thể, không phải thông báo chung |

- [ ] `startSession` nhận `callerId`, revalidate theo đúng thứ tự: state → creator → participants-vẫn-member
- [ ] `TC-031`, `TC-033`, `TC-034` pass ở tầng `A`; `TC-030`, `TC-032`, `TC-035` pass ở tầng `I`
- [ ] `GroupOverviewScreen` có nút "Mở phiên" khi đã có món
- [ ] Route `/groups/[groupId]/sessions/new` hoạt động, lỗi hiện đúng tại hàng, không phải banner chung
- [ ] `yarn verify && yarn arch:probe` xanh

---

# 1. Sửa lại một điều tôi từng nói sai — đọc trước khi code

Các guide E1-S4/S6 (viết trước trong dự án này) đều khẳng định driver WebSocket (`neon-serverless`) là bắt buộc **từ E3-T1**, vì phải "đọc Group Rule hiện tại rồi ghi thành Session Rule trong cùng transaction". Câu đó đã lọt vào chính code đã ship:

```
src/shared/db/client.ts:10
 * Đánh đổi: driver HTTP không chạy được interactive transaction nhiều câu lệnh. Từ E3-T1 trở
 * đi có vài chỗ bắt buộc interactive transaction (SPEC-008 revalidate + snapshot Group Rule sang
 * Session Rule — TC-030)...
```

```
src/features/session/application/start-session.ts:16-19
 * CỐ Ý CHƯA CÓ ở S4 (đều là E3-T1, xem Implementation Guide §0):
 * - kiểm người gọi là Creator (`ERR_NOT_SESSION_CREATOR`, TC-034)
 * - kiểm Participant vẫn là Group Member (`ERR_PARTICIPANT_NOT_MEMBER`, TC-031)
 * - snapshot Group Rule → Session Rule (SPEC-022, TC-030, TC-035)
```

**Đọc lại Master Plan §7 (E5) thì thấy claim đó sai.** Bảng `group_rules`/`session_rules` không tồn tại cho tới `E5-T1` (*"Schema group_rules và CRUD"*, phụ thuộc `E2-T5`) — sau cả E3. Việc snapshot là một subtask **riêng**:

```
E5-T4 | Snapshot Session Rule trong transaction Start | SPEC-022, TC-091→094 | 2h | phụ thuộc E5-T2, E3-T1 | ...
```

`E5-T4` phụ thuộc **vào** `E3-T1` (cơ chế Start phải có sẵn trước), không phải ngược lại. SPEC-008 mô tả snapshot như hệ quả của cả 5 bước, và TC-030's kỳ vọng đầy đủ có nhắc "snapshot Session Rules" — nhưng **không có bảng nào để snapshot vào** tại thời điểm code slice này. Việc snapshot không nằm trong phạm vi thật của `E3-T1`; nó chờ tới khi `E5-T4` chèn vào đúng transaction Start đã có sẵn ở đây.

**Hệ quả**: `E3-T1` **không cần driver WebSocket**. Bốn bước revalidate (state, creator, creator-vẫn-member, participants-vẫn-member) là các câu SELECT đọc trước, rồi một UPDATE có điều kiện DUY NHẤT — đúng hình dạng `startDraft` đã dùng từ E1-T7 (DEC-024/DEC-026 trong decision log hiện tại). Slice này:

1. Sửa docstring sai trong `start-session.ts` (xoá dòng "snapshot Group Rule" khỏi danh sách CỐ Ý CHƯA CÓ — nó không thuộc E3-T1).
2. Sửa comment sai trong `client.ts` (đổi "Từ E3-T1" thành "Từ E5-T4").
3. Ghi một Decision Log mới đính chính, xem §14.

---

# 2. Vấn đề thứ hai — mockup vẽ picker đa người, nhưng "Thêm Participant" là slice sau

Đã đọc verbatim `docs/designs/designs/S-07 S-08 Quy dinh va Mo phien.dc.html`. Màn "Mở phiên tối nay" (S-08) vẽ danh sách **toàn bộ thành viên nhóm**, mỗi hàng bấm để toggle "Chọn"/"Có ăn", CTA `"Bắt đầu phiên với " + N + " người"`. Lỗi hiện dưới đúng hàng người không hợp lệ, chỉ SAU khi bấm CTA lần đầu (`startTried` gate):

```js
error: s.startTried && p.gone && on ? p.name + " đã rời nhóm, không thể tham gia phiên." : ""
```

Nhưng **thêm Participant vào phiên là `E3-T3`/`E3-T4` — slice SAU (S2)**, chưa tồn tại. `createSession` (đã ship từ E1-T6) chỉ tự thêm đúng Creator làm Participant duy nhất — không nhận danh sách nào khác. Dựng đúng UI toggle-đa-người như mockup ở slice này sẽ mời bấm vào những hàng không làm gì cả.

**Quyết định phạm vi** (cùng tinh thần DEC-031 — E2 giữ model 0..5 nhưng sheet thêm món chỉ chọn một): slice này dựng đúng **cơ chế hiển thị lỗi tại hàng**, viết tổng quát cho N participant bất kỳ, nhưng **không dựng picker đa người**. Danh sách hàng ở slice này luôn có đúng 1 hàng (Creator) — participant duy nhất có thể tồn tại cho tới khi S2 cho phép thêm người khác. Khi S2 nối participant thật vào, layout hàng-lỗi này dùng lại nguyên vẹn, không viết lại.

**Cách kiểm "participant không hợp lệ" ở slice này**: tự tay gỡ membership của chính Creator trong `db:studio` — đó là đường DUY NHẤT tạo ra participant không hợp lệ khi chưa có T3/T4 (cùng cách E2-S2 dựng tay Dish `INACTIVE` để kiểm TC-020).

---

# 3. File tree

```
src/features/session/
  application/
    session-repository.ts             SỬA (+ findDraftToday, findForStart, SessionForStart)
    start-session.ts / .test.ts        SỬA (+ callerId, 4 bước revalidate)
    create-session.ts                  (không đụng)
  infrastructure/
    drizzle-session-repository.ts      SỬA (+ 2 method)
    drizzle-session-repository.integration.test.ts   SỬA (mở rộng)
  presentation/components/
    start-session-screen.tsx           + MỚI
    start-session-screen.test.tsx      + MỚI

src/features/group/
  application/
    membership-repository.ts           SỬA (+ findInvalidMembers)
  infrastructure/
    drizzle-group-repository.ts        SỬA (+ findInvalidMembers)
  presentation/components/
    group-overview-screen.tsx / .test.tsx   SỬA (+ CTA "Mở phiên")

src/shared/db/client.ts                SỬA (sửa comment sai)

src/app/groups/[groupId]/
  page.tsx                             SỬA (truyền openSessionHref)
  sessions/new/
    page.tsx                           + MỚI
    actions.ts                         + MỚI
```

---

# 4. Port `session-repository.ts` — thêm 2 method

```ts
export type SessionForStart = {
  readonly id: string
  readonly groupId: string
  readonly creatorUserId: string
  readonly state: SessionState
  readonly participantUserIds: readonly string[]
}

export interface SessionRepository {
  findBlockingSessionToday(groupId: string, decisionDate: string): Promise<{ id: string } | null>
  createDraftWithCreatorParticipant(input: NewSessionDraft): Promise<SessionSummary>
  startDraft(sessionId: string): Promise<StartDraftOutcome>
  findById(sessionId: string): Promise<SessionSummary | null>

  /**
   * MỚI — tái dùng Draft hôm nay thay vì tạo rác. `findBlockingSessionToday`
   * chỉ tính ACTIVE/FINALIZED (BR-025); đây là bản soi ngược lại: người dùng
   * ghé màn "Mở phiên" lần hai trong cùng ngày (ví dụ Start thất bại lần đầu
   * rồi quay lại) phải thấy lại đúng Draft cũ, không phải một Draft mới rỗng.
   */
  findDraftToday(groupId: string, decisionDate: string): Promise<SessionSummary | null>

  /**
   * MỚI — đọc đủ dữ liệu cho 4 bước revalidate của `startSession`. Tách khỏi
   * `findById` (dùng cho trang deck, S5) vì hai nơi cần hai hình dạng khác
   * nhau: deck cần `decisionDate` để hiện header, đây cần `creatorUserId` +
   * `participantUserIds` để kiểm quyền.
   */
  findForStart(sessionId: string): Promise<SessionForStart | null>
}
```

---

# 5. `start-session.ts` — SỬA, thêm `callerId`, 4 bước revalidate

```ts
import type { Failure } from '@/shared/errors'
import { failure } from '@/shared/errors'
import type { Result } from '@/shared/result'
import { err, ok } from '@/shared/result'

import type { SessionRepository, SessionSummary } from './session-repository'

export type InvalidParticipant = {
  readonly userId: string
  readonly displayName: string
}

export type StartSessionDeps = {
  readonly sessions: SessionRepository
  /**
   * Truyền từ `app/` — `session` không được import `group`
   * (`eslint.config.mjs` → `ALLOWED_CROSS_FEATURE` không có mục cho `session`
   * theo cả hai chiều). Cùng khuôn `assertAdmin` đã dùng ở E2-S3
   * (`set-system-tags.ts`) để feature `dish` gọi được `assertGroupAccess`.
   */
  readonly findInvalidParticipants: (input: {
    readonly groupId: string
    readonly userIds: readonly string[]
  }) => Promise<readonly InvalidParticipant[]>
}

/**
 * SPEC-008 — 4 bước revalidate, theo đúng thứ tự, dừng ở lỗi đầu tiên.
 *
 * Bước 5 (snapshot Group Rule → Session Rule) KHÔNG thuộc phạm vi hàm này —
 * bảng `group_rules`/`session_rules` chưa tồn tại (tạo ở E5-T1, sau cả E3).
 * `E5-T4` sẽ chèn bước snapshot vào ĐÚNG giao dịch `startDraft` bên dưới khi
 * bảng đã có. Xem Implementation Guide §1 cho phần đính chính đầy đủ.
 *
 * Bước 3 ("Creator vẫn Member") và bước 4 ("mọi Participant vẫn Member") gộp
 * thành MỘT lệnh gọi `findInvalidParticipants` trên toàn bộ
 * `participantUserIds` — Creator luôn nằm trong danh sách đó (SPEC-007:
 * `createDraftWithCreatorParticipant` đã thêm Creator làm Participant đầu
 * tiên, BR-020), nên bước 3 chỉ là một trường hợp riêng của bước 4, không cần
 * hai lệnh khác nhau.
 *
 * `startDraft` ở cuối vẫn là lưới an toàn chống race — nếu state đổi giữa lúc
 * đọc (`findForStart`) và lúc ghi, UPDATE có điều kiện vẫn đúng, không dựa
 * vào 4 bước đọc phía trên để đảm bảo tính đúng đắn dưới tải đồng thời.
 */
export async function startSession(
  deps: StartSessionDeps,
  sessionId: string,
  callerId: string,
): Promise<Result<SessionSummary, Failure>> {
  const session = await deps.sessions.findForStart(sessionId)

  if (session !== null) {
    if (session.state !== 'DRAFT') {
      return err(failure('ERR_SESSION_NOT_DRAFT', { sessionId }))
    }

    if (session.creatorUserId !== callerId) {
      return err(failure('ERR_NOT_SESSION_CREATOR', { sessionId }))
    }

    const invalid = await deps.findInvalidParticipants({
      groupId: session.groupId,
      userIds: session.participantUserIds,
    })
    if (invalid.length > 0) {
      return err(failure('ERR_PARTICIPANT_NOT_MEMBER', { invalidParticipants: invalid }))
    }
  }

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

`session === null` (id không tồn tại) bỏ qua thẳng 4 bước đọc, để `startDraft` tự trả `NOT_DRAFT` — không cần một nhánh lỗi riêng cho "không tìm thấy".

## 5.1 Test — mở rộng `start-session.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest'

import { startSession } from './start-session'
import type { SessionForStart, SessionRepository } from './session-repository'

function makeSession(overrides: Partial<SessionForStart> = {}): SessionForStart {
  return {
    id: 's1',
    groupId: 'g1',
    creatorUserId: 'creator',
    state: 'DRAFT',
    participantUserIds: ['creator'],
    ...overrides,
  }
}

function makeDeps(overrides: {
  session?: SessionForStart | null
  invalidParticipants?: { userId: string; displayName: string }[]
  startOutcome?: 'STARTED' | 'NOT_DRAFT' | 'ALREADY_EXISTS_TODAY'
} = {}) {
  const sessions: Partial<SessionRepository> = {
    findForStart: vi.fn(async () => (overrides.session === undefined ? makeSession() : overrides.session)),
    startDraft: vi.fn(async () => {
      const outcome = overrides.startOutcome ?? 'STARTED'
      if (outcome === 'STARTED') {
        return { outcome: 'STARTED', session: { id: 's1', groupId: 'g1', decisionDate: '2026-08-19', state: 'ACTIVE' } }
      }
      return { outcome }
    }),
  }
  const findInvalidParticipants = vi.fn(async () => overrides.invalidParticipants ?? [])
  return { sessions: sessions as SessionRepository, findInvalidParticipants }
}

describe('startSession', () => {
  it('TC-030 (rút gọn — chưa có rule) — happy path chuyển ACTIVE', async () => {
    const deps = makeDeps()

    const result = await startSession(deps, 's1', 'creator')

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.value.state).toBe('ACTIVE')
  })

  it('TC-033 — session không còn DRAFT: ERR_SESSION_NOT_DRAFT, không gọi findInvalidParticipants', async () => {
    const deps = makeDeps({ session: makeSession({ state: 'ACTIVE' }) })

    const result = await startSession(deps, 's1', 'creator')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_SESSION_NOT_DRAFT')
    expect(deps.findInvalidParticipants).not.toHaveBeenCalled()
  })

  it('TC-034 — người gọi không phải Creator: ERR_NOT_SESSION_CREATOR', async () => {
    const deps = makeDeps()

    const result = await startSession(deps, 's1', 'nguoi-la')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_NOT_SESSION_CREATOR')
    expect(deps.findInvalidParticipants).not.toHaveBeenCalled()
  })

  it('TC-031 — 1 participant đã rời Group: ERR_PARTICIPANT_NOT_MEMBER kèm tên', async () => {
    const deps = makeDeps({
      session: makeSession({ participantUserIds: ['creator', 'mem-2'] }),
      invalidParticipants: [{ userId: 'mem-2', displayName: 'Chú Tư' }],
    })

    const result = await startSession(deps, 's1', 'creator')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_PARTICIPANT_NOT_MEMBER')
    expect(result.error.details?.['invalidParticipants']).toEqual([{ userId: 'mem-2', displayName: 'Chú Tư' }])
  })

  it('Creator tự rời Group — bắt được bởi cùng một lệnh gọi (bước 3 = trường hợp riêng của bước 4)', async () => {
    const deps = makeDeps({
      invalidParticipants: [{ userId: 'creator', displayName: 'Bạn' }],
    })

    const result = await startSession(deps, 's1', 'creator')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_PARTICIPANT_NOT_MEMBER')
  })

  it('session không tồn tại: bỏ qua 4 bước đọc, để startDraft tự trả NOT_DRAFT', async () => {
    const deps = makeDeps({ session: null, startOutcome: 'NOT_DRAFT' })

    const result = await startSession(deps, 'khong-ton-tai', 'ai-do')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_SESSION_NOT_DRAFT')
    expect(deps.findInvalidParticipants).not.toHaveBeenCalled()
  })

  it('TC-032/TC-107 — race lúc ghi: ALREADY_EXISTS_TODAY dù 4 bước đọc đều qua', async () => {
    const deps = makeDeps({ startOutcome: 'ALREADY_EXISTS_TODAY' })

    const result = await startSession(deps, 's1', 'creator')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.error.code).toBe('ERR_SESSION_EXISTS_TODAY')
  })
})
```

TC-035 ("Start thất bại thì không có Session Rule nào bị ghi rác") không kiểm được ở slice này — chưa có bảng Session Rule. Nó thuộc phạm vi `E5-T4`, xem §1.

---

# 6. Infra `drizzle-session-repository.ts` — thêm 2 method

```ts
async function findDraftToday(
  groupId: string,
  decisionDate: string,
): Promise<SessionSummary | null> {
  const rows = await getDb()
    .select({
      id: selectionSessions.id,
      groupId: selectionSessions.groupId,
      decisionDate: selectionSessions.decisionDate,
      state: selectionSessions.state,
    })
    .from(selectionSessions)
    .where(
      and(
        eq(selectionSessions.groupId, groupId),
        eq(selectionSessions.decisionDate, decisionDate),
        eq(selectionSessions.state, 'DRAFT'),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

async function findForStart(sessionId: string): Promise<SessionForStart | null> {
  const db = getDb()

  const sessionRows = await db
    .select({
      id: selectionSessions.id,
      groupId: selectionSessions.groupId,
      creatorUserId: selectionSessions.creatorUserId,
      state: selectionSessions.state,
    })
    .from(selectionSessions)
    .where(eq(selectionSessions.id, sessionId))
    .limit(1)

  const session = sessionRows[0]
  if (session === undefined) {
    return null
  }

  const participantRows = await db
    .select({ userId: participants.userId })
    .from(participants)
    .where(eq(participants.sessionId, sessionId))

  return { ...session, participantUserIds: participantRows.map((row) => row.userId) }
}
```

Hai câu SELECT riêng, không `array_agg` một câu — đây không phải đường nóng nhiều lượt gọi (chỉ chạy một lần mỗi lượt Start), và hai câu đơn giản dễ đọc/dễ test hơn một câu JOIN có aggregate. Không cần round-trip tối ưu ở đây.

Thêm cả hai vào `export const drizzleSessionRepository`.

## 6.1 Integration test — mở rộng `drizzle-session-repository.integration.test.ts`

```ts
it('findForStart trả đủ participantUserIds, kể cả khi có nhiều người', async () => {
  // dựng 1 group, 1 user creator + 1 user khác, tạo draft, insert thêm 1 participant
  // trực tiếp qua db.insert(participants) (chưa có use case add-participant ở slice này)
  // rồi gọi findForStart, assert participantUserIds có đủ 2 id.
})

it('findDraftToday trả về Draft cũ nếu gọi createSession-flow hai lần trong cùng ngày', async () => {
  // tạo draft lần 1, gọi findDraftToday → phải trả đúng id đó, không tạo thêm.
})
```

---

# 7. `MembershipRepository` (group) — thêm `findInvalidMembers`

```ts
export interface MembershipRepository {
  findMembership(groupId: string, userId: string): Promise<Membership | null>

  /**
   * MỚI (E3-T1 cần, xuyên qua `app/` — xem `start-session.ts` §5). Trả về
   * đúng những `userId` trong danh sách KHÔNG còn là Member đang hoạt động
   * của Group này — thiếu hẳn row hoặc `removed_at IS NOT NULL` đều tính.
   * Kèm `displayName` để E3-T2 hiện được tên cụ thể tại hàng, không phải chỉ
   * một UUID.
   */
  findInvalidMembers(
    groupId: string,
    userIds: readonly string[],
  ): Promise<{ readonly userId: string; readonly displayName: string }[]>
}
```

## 7.1 Infra — `drizzle-group-repository.ts`

```ts
async function findInvalidMembers(
  groupId: string,
  userIds: readonly string[],
): Promise<{ userId: string; displayName: string }[]> {
  if (userIds.length === 0) {
    return []
  }

  const db = getDb()
  const rows = await db
    .select({ userId: users.id, displayName: users.displayName })
    .from(users)
    .leftJoin(
      groupMembers,
      and(eq(groupMembers.userId, users.id), eq(groupMembers.groupId, groupId)),
    )
    .where(
      and(
        inArray(users.id, userIds),
        or(isNull(groupMembers.id), isNotNull(groupMembers.removedAt)),
      ),
    )

  return rows
}
```

`LEFT JOIN` từ `users` (không phải từ `groupMembers`) là điểm mấu chốt: bắt đầu từ `groupMembers` sẽ không bao giờ thấy được người **chưa từng** có row (`groupMembers.id IS NULL` không thể xảy ra nếu chính bảng đó là nguồn). Bắt đầu từ `users` rồi `LEFT JOIN` ra `groupMembers` mới giữ được cả hai trường hợp: chưa từng là Member, và đã bị gỡ.

Thêm vào `export const drizzleMembershipRepository`. Import mới cần ở đầu file: `users` từ `@/shared/db/schema`, `or`, `isNull`, `isNotNull` từ `drizzle-orm`.

---

# 8. `app/groups/[groupId]/sessions/new/` — route mới

## 8.1 `page.tsx`

```tsx
import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { StartSessionScreen } from '@/features/session/presentation/components/start-session-screen'

import { requireGroupContext } from '../../group-access'
import { openSessionAction } from './actions'

type NewSessionPageProps = {
  params: Promise<{ groupId: string }>
}

/**
 * KHÔNG tạo Draft ở đây. Trang này chỉ ĐỌC — người dùng có thể ghé xem rồi
 * bấm "Huỷ" mà không để lại rác trong DB. Việc tạo/tái dùng Draft nằm trong
 * `openSessionAction`, chạy khi thật sự bấm "Bắt đầu phiên".
 *
 * Chỉ hiện đúng MỘT hàng — chính người dùng hiện tại — vì đó là participant
 * DUY NHẤT có thể tồn tại cho tới khi E3-T3/T4 (S2) cho thêm người khác. Xem
 * Implementation Guide §2.
 */
export default async function NewSessionPage({ params }: NewSessionPageProps) {
  const { groupId } = await params
  const { group, user } = await requireGroupContext(groupId)

  return (
    <StartSessionScreen
      groupName={group.name}
      dateCaption={/* xem §9 — formatVietnameseDate(resolveDecisionDate(...)) */ ''}
      participants={[{ userId: user.id, displayName: user.displayName, error: null }]}
      blockText={null}
      action={openSessionAction.bind(null, groupId)}
    />
  )
}
```

Điền `dateCaption` bằng đúng cách `GroupPage` đang làm (`formatVietnameseDate(resolveDecisionDate(new Date(), group.timezone))`) — cần `requireGroupContext` trả về `group.timezone`, đã có sẵn trong `GroupSummary`.

## 8.2 `actions.ts`

```ts
'use server'

import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/features/auth/infrastructure/session'
import { createSession } from '@/features/session/application/create-session'
import { startSession } from '@/features/session/application/start-session'
import { resolveDecisionDate } from '@/features/session/domain/decision-date'
import { drizzleSessionRepository } from '@/features/session/infrastructure/drizzle-session-repository'
import { drizzleMembershipRepository } from '@/features/group/infrastructure/drizzle-group-repository'
import type { StartSessionFormState } from '@/features/session/presentation/components/start-session-screen'
import type { Failure } from '@/shared/errors'

import { requireGroupContext } from '../../group-access'

function toVietnameseBlockText(error: Failure): string | null {
  if (error.code === 'ERR_PARTICIPANT_NOT_MEMBER') {
    // Banner tổng — hàng lỗi riêng đã hiện tên cụ thể (xem screen component).
    return 'Bỏ những người đã rời nhóm ra trước khi bắt đầu.'
  }
  if (error.code === 'ERR_NOT_SESSION_CREATOR') {
    return 'Chỉ người mở phiên mới bắt đầu được.'
  }
  return 'Không mở được phiên. Thử lại giúp mình.'
}

export async function openSessionAction(
  groupId: string,
  _previousState: StartSessionFormState,
): Promise<StartSessionFormState> {
  const { group, user } = await requireGroupContext(groupId)
  const decisionDate = resolveDecisionDate(new Date(), group.timezone)

  const existingDraft = await drizzleSessionRepository.findDraftToday(groupId, decisionDate)

  let sessionId: string
  if (existingDraft !== null) {
    sessionId = existingDraft.id
  } else {
    const created = await createSession(
      { sessions: drizzleSessionRepository },
      { groupId, creatorUserId: user.id, decisionDate },
    )

    if (!created.ok) {
      // ERR_SESSION_EXISTS_TODAY — một phiên khác đã ACTIVE/FINALIZED hôm nay.
      // US-008: "điều hướng tôi tới phiên đang chạy", không phải lỗi bí ẩn.
      const blocking = await drizzleSessionRepository.findBlockingSessionToday(groupId, decisionDate)
      if (blocking !== null) {
        redirect(`/sessions/${blocking.id}`)
      }
      return { blockText: 'Không mở được phiên. Thử lại giúp mình.', invalidParticipantIds: [] }
    }

    sessionId = created.value.id
  }

  const result = await startSession(
    {
      sessions: drizzleSessionRepository,
      findInvalidParticipants: ({ groupId: gid, userIds }) =>
        drizzleMembershipRepository.findInvalidMembers(gid, userIds),
    },
    sessionId,
    user.id,
  )

  if (!result.ok) {
    const invalidParticipantIds =
      result.error.code === 'ERR_PARTICIPANT_NOT_MEMBER'
        ? ((result.error.details?.['invalidParticipants'] as { userId: string }[] | undefined)?.map(
            (p) => p.userId,
          ) ?? [])
        : []

    return { blockText: toVietnameseBlockText(result.error), invalidParticipantIds }
  }

  redirect(`/sessions/${sessionId}`)
}
```

`getCurrentUser` import ở trên thực ra không cần — `requireGroupContext` đã tự gọi nó và trả `user`. Xoá dòng import đó khi code (để lại ở đây chỉ vì liệt kê full import list dễ quên).

Đọc kỹ `result.error.details?.['invalidParticipants']` — đây là ép kiểu từ `Record<string, unknown>` (`Failure.details`), không type-safe tuyệt đối. Cân nhắc thay bằng một helper `isInvalidParticipantsDetail` runtime-check nếu muốn chặt hơn; ở mức slice này, ép kiểu trực tiếp là đủ vì cả hai đầu (viết ở `start-session.ts`, đọc ở đây) đều trong tầm kiểm soát của cùng một PR.

---

# 9. `GroupOverviewScreen` — SỬA, thêm CTA "Mở phiên"

Design Criteria dòng 148: *"S-04 | Nhóm chưa có món: Chặn nút mở phiên, hướng dẫn thêm món"* — xác nhận nút Mở phiên thuộc S-04, ẩn/thay thế khi chưa có món.

```tsx
export type GroupOverviewScreenProps = {
  groupName: string
  dateCaption: string
  dishCount: number
  dishesHref: string
  inviteHref: string
  openSessionHref: string   // MỚI
}
```

Nút chính ở đáy màn:

```tsx
<Link
  href={hasDishes ? openSessionHref : dishesHref}
  className="flex min-h-14 w-full items-center justify-center rounded-control bg-accent px-6 text-subtitle font-semibold text-on-accent shadow-button transition-transform duration-100 hover:bg-accent-hover active:scale-[0.98] active:bg-accent-active"
>
  {hasDishes ? 'Mở phiên' : 'Thêm món đầu tiên'}
</Link>
```

`!hasDishes` giữ nguyên hành vi cũ hệt (trỏ `dishesHref`, chữ `Thêm món đầu tiên`) — không đổi gì cho trường hợp chưa có món. `GroupPage` (`app/groups/[groupId]/page.tsx`) truyền thêm prop `openSessionHref={`/groups/${groupId}/sessions/new`}`.

---

# 10. `StartSessionScreen` — MỚI

```tsx
'use client'

import type { ReactElement } from 'react'
import { useActionState } from 'react'

import { Banner } from '@/shared/ui/banner'
import { Button } from '@/shared/ui/button'

export type ParticipantRow = {
  readonly userId: string
  readonly displayName: string
  readonly error: string | null
}

export type StartSessionFormState = {
  readonly blockText: string | null
  readonly invalidParticipantIds: readonly string[]
}

export type StartSessionScreenProps = {
  groupName: string
  dateCaption: string
  participants: readonly ParticipantRow[]
  blockText: string | null
  action: (state: StartSessionFormState, formData: FormData) => Promise<StartSessionFormState>
}

const INITIAL_STATE: StartSessionFormState = { blockText: null, invalidParticipantIds: [] }

/**
 * S-08 — "Mở phiên tối nay". Copy verbatim từ mockup.
 *
 * Hàng participant Ở SLICE NÀY là `<li>` tĩnh, KHÔNG phải `<button>` toggle
 * như mockup — chưa có gì để toggle cho tới khi E3-T3/T4 (S2) cho thêm
 * participant. `error` trên mỗi hàng vẫn hoạt động đầy đủ ngay từ bây giờ:
 * component nhận mảng participant TỔNG QUÁT, S2 chỉ cần đổi `<li>` này thành
 * `<button>` và thêm khả năng thêm hàng — không viết lại phần lỗi.
 */
export function StartSessionScreen({
  groupName,
  dateCaption,
  participants,
  blockText: initialBlockText,
  action,
}: StartSessionScreenProps): ReactElement {
  const [state, formAction, pending] = useActionState(action, {
    ...INITIAL_STATE,
    blockText: initialBlockText,
  })

  const rows = participants.map((p) => ({
    ...p,
    error: state.invalidParticipantIds.includes(p.userId)
      ? `${p.displayName} đã rời nhóm, không thể tham gia phiên.`
      : null,
  }))

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-6">
        <div className="flex flex-col gap-1">
          <span className="text-caption font-medium text-ink-muted">{dateCaption}</span>
          <h1 className="text-title font-semibold text-ink">Mở phiên tối nay</h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-4 pt-3">
        <div className="flex flex-col gap-2">
          <span className="pl-1 text-caption font-medium text-ink-muted">Tối nay ai ăn ở nhà</span>
          <ul className="flex flex-col gap-2">
            {rows.map((row, index) => (
              <li key={row.userId} className="flex flex-col gap-1">
                <div className="flex min-h-14 items-center justify-between gap-3 rounded-control border border-border bg-surface-raised p-4">
                  <span className="text-subtitle font-semibold text-ink">{row.displayName}</span>
                  <span className="text-caption font-medium text-ink-muted">
                    {index === 0 ? 'Người mở phiên · chốt bữa' : 'Trong nhóm'}
                  </span>
                </div>
                {row.error === null ? null : (
                  <span className="pl-1 text-caption font-medium text-danger">{row.error}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8 pt-4">
        {state.blockText === null ? null : <Banner tone="danger">{state.blockText}</Banner>}

        <form action={formAction}>
          <Button type="submit" pending={pending}>
            {`Bắt đầu phiên với ${participants.length} người`}
          </Button>
        </form>

        <span className="self-center text-caption font-medium text-ink-muted">
          Ai cũng sửa lượt của mình được cho tới khi bạn chốt
        </span>
      </div>
    </main>
  )
}
```

`index === 0 ? 'Người mở phiên · chốt bữa' : 'Trong nhóm'` — đúng copy mockup cho hai loại hàng, dù ở slice này chỉ có đúng một hàng nên nhánh `else` chưa từng chạy thật; giữ nguyên vì component viết tổng quát (§2).

`Banner tone="danger"` thay thế đúng khối "thanh dọc đỏ + nền hồng" mockup tự vẽ tay — không viết lại primitive đã có.

## 10.1 Test — `start-session-screen.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StartSessionScreen } from './start-session-screen'

const ONE_PARTICIPANT = [{ userId: 'u1', displayName: 'Bạn', error: null }]

describe('StartSessionScreen (S-08)', () => {
  it('hiện đúng heading, ngày, và nút CTA đúng số người', () => {
    render(
      <StartSessionScreen
        groupName="Nhà Bảy Hiền"
        dateCaption="Thứ Ba · 19 tháng 8"
        participants={ONE_PARTICIPANT}
        blockText={null}
        action={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Mở phiên tối nay' })).toBeDefined()
    expect(screen.getByText('Thứ Ba · 19 tháng 8')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Bắt đầu phiên với 1 người' })).toBeDefined()
  })

  it('action trả invalidParticipantIds thì hiện lỗi ĐÚNG TẠI HÀNG, không phải chỉ banner chung (E3-T2 DoD)', async () => {
    async function failingAction() {
      return {
        blockText: 'Bỏ những người đã rời nhóm ra trước khi bắt đầu.',
        invalidParticipantIds: ['u1'],
      }
    }

    render(
      <StartSessionScreen
        groupName="Nhà Bảy Hiền"
        dateCaption="Thứ Ba · 19 tháng 8"
        participants={ONE_PARTICIPANT}
        blockText={null}
        action={failingAction}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Bắt đầu phiên với 1 người' }))

    expect(await screen.findByText('Bạn đã rời nhóm, không thể tham gia phiên.')).toBeDefined()
    expect(screen.getByText('Bỏ những người đã rời nhóm ra trước khi bắt đầu.')).toBeDefined()
  })

  it('không có lỗi thì không banner, không có span lỗi nào', () => {
    render(
      <StartSessionScreen
        groupName="Nhà Bảy Hiền"
        dateCaption="Thứ Ba · 19 tháng 8"
        participants={ONE_PARTICIPANT}
        blockText={null}
        action={vi.fn()}
      />,
    )

    expect(screen.queryByRole('alert')).toBeNull()
  })
})
```

---

# 11. Sửa comment sai — §1 đã hẹn

`src/shared/db/client.ts`, đổi:

```diff
- * Đánh đổi: driver HTTP không chạy được interactive transaction nhiều câu lệnh. Từ E3-T1 trở
- * đi có vài chỗ bắt buộc interactive transaction (SPEC-008 revalidate + snapshot Group Rule sang
- * Session Rule — TC-030). Khi tới đó sẽ cần thêm driver WebSocket (`neon-serverless`) song song,
+ * Đánh đổi: driver HTTP không chạy được interactive transaction nhiều câu lệnh. Từ E5-T4 trở
+ * đi có một chỗ bắt buộc interactive transaction (SPEC-022 snapshot Group Rule sang Session
+ * Rule bên trong giao dịch Start — TC-091). Khi tới đó sẽ cần thêm driver WebSocket (`neon-serverless`) song song,
```

`start-session.ts`'s docstring đã viết lại toàn bộ ở §5 — không cần diff riêng, chỉ cần chắc chắn bản mới thay thế đúng bản cũ khi code.

---

# 12. Rủi ro

| Rủi ro | Hậu quả | Giảm thiểu |
| --- | --- | --- |
| `openSessionAction` gọi `createSession` MỖI LẦN người dùng bấm mà không kiểm `findDraftToday` trước | Tích rác nhiều Draft cho cùng group+ngày mỗi lần Start thất bại rồi thử lại | §8.2 đã kiểm `findDraftToday` trước, chỉ `createSession` khi thật sự chưa có |
| Ép kiểu `details?.['invalidParticipants']` không runtime-safe | Nếu ai đó đổi shape của `Failure.details` ở `start-session.ts` mà quên đổi `actions.ts`, lỗi âm thầm (mảng rỗng, không phải crash) | Cả hai đầu trong cùng PR/slice, review kỹ khi đổi; cân nhắc runtime type guard nếu shape này lặp lại ở slice khác |
| `findInvalidMembers` với `userIds` rỗng | Query `IN ()` không hợp lệ ở một số driver | Đã chặn bằng `if (userIds.length === 0) return []` ở đầu hàm — không thể xảy ra thật (participant list luôn có ít nhất Creator) nhưng vẫn phòng thủ rẻ |
| Test tầng A dùng `ERR_PARTICIPANT_NOT_MEMBER` cho cả "Creator rời nhóm" lẫn "participant thường rời nhóm" — không phân biệt được qua mã lỗi | Nếu về sau cần thông điệp khác nhau cho hai ca, phải đọc `details.invalidParticipants` để phân biệt (so `userId` với `creatorUserId`), không dựa vào `code` | Đã thiết kế `details` mang đủ thông tin (`userId`, `displayName`) để làm việc đó nếu cần — không phải sửa port |

---

# 13. Test Cases coverage

| TC | Mô tả | Tầng | Nơi test |
| --- | --- | --- | --- |
| `TC-030` | Happy — Start Draft hợp lệ → ACTIVE (rút gọn, chưa snapshot rule) | `I`/`A` | `start-session.test.ts` (rút gọn), integration |
| `TC-031` | 1 Participant đã rời Group → `ERR_PARTICIPANT_NOT_MEMBER` | `A` | `start-session.test.ts` |
| `TC-032` | Group đã có phiên `ACTIVE` cùng ngày → `ERR_SESSION_EXISTS_TODAY` | `I` | integration (đã có từ E1-T7, TC-107) |
| `TC-033` | Phiên đã `ACTIVE`, Start lần nữa → `ERR_SESSION_NOT_DRAFT` | `A` | `start-session.test.ts` |
| `TC-034` | Người gọi không phải Creator → `ERR_NOT_SESSION_CREATOR` | `A` | `start-session.test.ts` |
| `TC-035` | Start thất bại → không Session Rule nào bị ghi rác | — | **Ngoài phạm vi slice này** — chờ `E5-T4`, xem §1 |

---

# 14. Verify

## 14.1 Cổng máy

```bash
yarn verify && yarn arch:probe && yarn build
yarn test:integration
```

`yarn test` phải in `startSession` (6 ca mới ở §5.1), `findInvalidMembers` nếu có unit test riêng, `StartSessionScreen`, `GroupOverviewScreen` (mở rộng). `yarn test:integration` in `findForStart`, `findDraftToday`.

**`yarn arch:probe` là cổng quan trọng nhất của slice này.** Hai chỗ dễ vi phạm ranh giới feature:

1. `start-session.ts` lỡ import thẳng gì đó từ `group` thay vì nhận qua `findInvalidParticipants` injected.
2. `session/presentation/**` lỡ import `application/` trực tiếp thay vì nhận `action` qua prop.

## 14.2 Bằng chứng DoD của E3-T2 — lỗi tại hàng, không phải thông báo chung

Đây là câu kiểm tay quan trọng nhất, vì test tự động chỉ chứng minh được component NHẬN đúng prop, không chứng minh được trải nghiệm thật "thấy tên người cụ thể":

1. `yarn dev`, đăng nhập, tạo nhóm, thêm ít nhất 1 món (để nút "Mở phiên" hiện).
2. Vào `/groups/{id}/sessions/new`. Thấy đúng 1 hàng — tên chính bạn, ghi chú "Người mở phiên · chốt bữa".
3. **Trong một tab khác**, `yarn db:studio` → bảng `group_members` → tìm dòng của chính bạn trong nhóm này → sửa `removed_at` thành một timestamp bất kỳ (giả lập "đã rời nhóm").
4. Quay lại tab đầu, bấm "Bắt đầu phiên với 1 người".
5. **Kỳ vọng**: dưới đúng hàng tên bạn hiện `"{Tên bạn} đã rời nhóm, không thể tham gia phiên."`, VÀ có thêm banner đỏ `"Bỏ những người đã rời nhóm ra trước khi bắt đầu."` ở dưới. Nếu chỉ thấy banner mà KHÔNG thấy dòng chữ dưới tên — E3-T2 chưa đạt, dù `yarn test` xanh.
6. Sửa `removed_at` về lại `null` trong `db:studio`, bấm lại "Bắt đầu phiên" → vào thẳng `/sessions/{id}`.

## 14.3 Bằng chứng "điều hướng tới phiên đang chạy" (US-008)

1. Mở phiên thành công (bước 6 ở trên).
2. Từ nhóm đó, vào lại `/groups/{id}/sessions/new` một lần nữa (phiên vẫn đang ACTIVE).
3. Bấm "Bắt đầu phiên". → Kỳ vọng: chuyển thẳng sang `/sessions/{id}` của phiên ĐANG CHẠY, không phải một lỗi chung chung hay một Draft thứ hai.

## 14.4 Bằng chứng "không tạo rác" — `findDraftToday`

1. Vào `/groups/{id}/sessions/new` cho một nhóm CHƯA có phiên nào hôm nay.
2. Gỡ membership của chính mình (như bước 3 ở §14.2) TRƯỚC KHI bấm Start lần đầu.
3. Bấm "Bắt đầu phiên" → thất bại (đúng như kỳ vọng, do bạn vừa tự gỡ membership).
4. `yarn db:studio` → `selection_sessions` → đúng **một** dòng `DRAFT` cho group+ngày này.
5. Khôi phục `removed_at = null`, bấm lại "Bắt đầu phiên" → thành công.
6. `yarn db:studio` lại → vẫn đúng **một** dòng (giờ đã `ACTIVE`) — không có dòng `DRAFT` thứ hai bị bỏ quên từ bước 3.

---

# 15. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-033 — E3-T1 Does Not Need the WebSocket Driver; the Rule Snapshot Belongs to E5-T4

**Ngày quyết định:** 2026-08-19 | **Trạng thái:** Accepted

## Quyết định

`startSession`'s 4-step revalidation (session state, caller-is-creator,
participants-still-members) runs entirely on the existing `neon-http` driver:
explicit SELECT reads followed by the single conditional UPDATE already
implemented at E1-T7. No WebSocket driver (`neon-serverless`) is introduced at
E3-T1.

## Rationale

Earlier guides (E1-S4, E1-S6) and their resulting code comments
(`src/shared/db/client.ts`, `start-session.ts`) claimed the WebSocket driver
would be required starting at E3-T1, reasoning that SPEC-008's "snapshot
Group Rule → Session Rule" step needed a genuine interactive read-then-write
transaction. This was incorrect: `group_rules`/`session_rules` do not exist
until `E5-T1` (dependency: `E2-T5`), which lands after E3 entirely. The
snapshot is its own Master Plan subtask, `E5-T4`, which explicitly depends on
`E3-T1` (not the reverse) — it inserts the snapshot into the transaction
`startDraft` already provides, once the rule tables exist. E3-T1's own scope
never touches rules at all.

## Consequence

The forward-looking comments in `client.ts` and `start-session.ts` are
corrected to point at `E5-T4` instead of `E3-T1` (see Implementation Guide
§1/§11). Anyone implementing `E5-T4` should re-read this entry before
reaching for `neon-serverless` — the interactive transaction requirement is
real, just two epics later than previously documented.

## Affected Documents

- `src/shared/db/client.ts` (comment corrected)
- `src/features/session/application/start-session.ts` (docstring corrected)
- Master Plan §7 (E5-T4 scope note, no textual change needed — already correct)
```

---

# 16. Master Plan

Sau khi `yarn verify`/`yarn arch:probe`/`yarn test:integration` xanh và §14.2–§14.4 đã kiểm tay: tick `E3-T1` và `E3-T2` ở §5.
