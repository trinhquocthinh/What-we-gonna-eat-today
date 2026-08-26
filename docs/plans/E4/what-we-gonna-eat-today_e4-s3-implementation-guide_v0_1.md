# 🔒 Implementation Guide — E4 Slice S3: Ghi tương tác đáng tin cậy

> **Document Metadata**
>
> - **Version:** `0.1` | **Status:** `Ready to code (TDD)`
> - **Created:** `2026-08-19`
> - **Upstream:** [Master Plan](../../what-we-gonna-eat-today_master-plan_v2.1.md) (`E4-T5`, `E4-T6`) • [SDD](../../what-we-gonna-eat-today_sdd_v1.3.md) (`SPEC-012`) • [Tech Spec](../../what-we-gonna-eat-today_tech-spec-architecture_v1.2.md) (§11 `R-04`, NFR-05) • [Test Cases](../../what-we-gonna-eat-today_test-cases-specification_v1.1.md) (`TC-106`)
> - **Tiền đề:** `E1-T9` đã code (`applyInteraction`, `sendInteractionWithRetry`, dải báo offline).
>
> 🔒 *Chặn ghi đè sai thứ tự khi hai lượt vuốt cùng món tới server không đúng thứ tự người dùng bấm. E4-T6 hoá ra gần như đã xong từ E1-T9 — chỉ cần xuyên một tham số mới qua.*

---

# 0. Việc cần làm và điều kiện xong

| ID | Việc | Giờ | File | Xong nghĩa là |
| --- | --- | --- | --- | --- |
| `E4-T5` | Upsert Interaction chống ghi đè sai thứ tự | 2.5 | `src/features/selection/application/record-interaction.ts` | `TC-106` pass — Record đến muộn có timestamp cũ hơn bị bỏ qua |
| `E4-T6` | Retry khi mất mạng, không chặn thao tác | 1.5 | `src/features/selection/presentation/**` | Tắt mạng vẫn vuốt tiếp được, có dải thông báo ở đỉnh |

- [x] `TC-106` pass ở tầng `I` — hai swipe cùng dish, bản đến sau có `clientTimestamp` cũ hơn bị bỏ qua, DB giữ giá trị mới hơn
- [x] `applyInteraction`/`recordInteraction` nhận `clientTimestamp`, xuyên xuống tới tận `onConflictDoUpdate`
- [x] Route Handler validate `clientTimestamp` là ISO date hợp lệ
- [x] `send-interaction.ts` gửi `clientTimestamp` cố định cho mọi lần thử lại của CÙNG một hành động
- [x] `yarn verify && yarn arch:probe && yarn test:integration` xanh

---

# 1. Phát hiện quan trọng nhất: E4-T6 gần như đã xong từ E1-T9

Đọc lại `send-interaction.ts` và `deck-screen.tsx` (đã ship, không đụng gì từ E1-T9 tới giờ):

```ts
// send-interaction.ts — ĐÃ CÓ
const RETRY_DELAYS_MS = [1000, 2000, 4000]
// ... retry khi lỗi mạng, KHÔNG retry lỗi 4xx, gọi onStatusChange('retrying'|'failed'|'idle')
```

```tsx
// deck-screen.tsx — ĐÃ CÓ
{sendStatus === 'idle' ? null : (
  <div className="flex items-center gap-2 border-b border-border bg-warning-soft px-4 py-2">
    <span aria-hidden className="h-4 w-hairline rounded-full bg-warning" />
    <span className="text-caption font-medium text-ink">
      {sendStatus === 'retrying'
        ? 'Đang thử gửi lại · bạn vuốt tiếp được'
        : `Không gửi được ${failedCount} lượt vuốt. Vuốt tiếp vẫn được.`}
    </span>
  </div>
)}
```

Đây **đúng nguyên văn** DoD của E4-T6: *"Tắt mạng vẫn vuốt tiếp được, có dải thông báo ở đỉnh."* Không có gì để dựng lại. Việc thật của E4-T6 ở slice này chỉ là xuyên `clientTimestamp` — thứ E4-T5 cần thêm — qua đúng đường ống đã có, không viết UI mới, không thêm cơ chế retry mới.

---

# 2. SPEC-012 thiếu `clientTimestamp` — phải thêm, không có cách nào khác

`Đầu vào` chính thức của SPEC-012: `{ sessionId, dishId, action }`. Nhưng `R-04` (Tech Spec §11) đòi: *"Upsert theo `updated_at` phía server; bỏ qua bản ghi có timestamp cũ hơn."* Và `TC-106` nói cụ thể hơn:

```
TC-106 | R-04 | Biên | A | 2 Swipe cùng món, bản đến sau có timestamp cũ hơn | Server bỏ qua bản đến muộn, giữ bản mới nhất
```

**"Đến sau" (thứ tự ARRIVAL, do mạng) khác "timestamp cũ hơn" (thứ tự Ý ĐỊNH, do người dùng bấm).** Hai request hoàn toàn có thể tới server SAI thứ tự so với lúc người dùng thao tác — đó chính xác là điều `R-04` mô tả: *"Vuốt thẻ quá nhanh gây ghi đè sai thứ tự."* Không có cách nào server tự suy ra thứ tự Ý ĐỊNH nếu client không gửi kèm mốc thời gian lúc bấm — server chỉ biết lúc NÓ nhận được request, không biết lúc người dùng CHẠM màn hình.

**Bắt buộc thêm `clientTimestamp` vào đầu vào.** Cùng loại khoảng hở đã gặp ở SPEC-013 (E3-S3, thiếu `userId` tường minh) — lần này lấp bằng cách thêm hẳn một tham số mới, không phải tách use case, vì không có cách diễn giải nào khác cho `Đầu vào` hiện có mà vẫn đạt được DoD.

---

# 3. Quyết định kỹ thuật: `ON CONFLICT ... DO UPDATE ... WHERE`, không đọc-rồi-ghi

Đã đọc `node_modules/drizzle-orm/pg-core/query-builders/insert.d.ts`:

```ts
export interface PgInsertOnConflictDoUpdateConfig<T extends AnyPgInsert> {
    target: IndexColumn | IndexColumn[];
    targetWhere?: SQL;
    setWhere?: SQL;
    set: PgUpdateSetSource<T['_']['table']>;
}
```

`setWhere` khác `targetWhere`: `targetWhere` lọc DÒNG NÀO được coi là "đụng độ"; `setWhere` quyết định có ÁP DỤNG `SET` hay không MỘT KHI đã xác định là đụng độ. Đúng thứ cần — `setWhere: sql\`${interactions.updatedAt} < ${clientTimestamp}\`` khiến UPDATE chỉ xảy ra nếu dòng đang lưu **cũ hơn** giá trị mới. Một câu SQL duy nhất, không cần đọc trước rồi so sánh ở tầng application (tránh TOCTOU, tránh driver WebSocket — đúng tinh thần DEC-018/DEC-024/DEC-026/DEC-033 đã lặp lại xuyên suốt dự án: một câu điều kiện thay vì đọc-rồi-ghi).

**Khi thua (WHERE sai):** `.returning()` của chính statement đó trả về **rỗng** — không phải lỗi, không phải ngoại lệ. `interactionEvents` vẫn thêm đúng một dòng trong CÙNG batch (audit log ghi MỌI request, kể cả bị từ chối — đúng comment sẵn có trong file: *"mọi request SPEC-012 đều thêm một dòng"*, DEC-025).

`applyInteraction` đọc `.length` của kết quả UPDATE:

- **Thắng** (`.length > 0`): trả `type` vừa ghi — đúng, vì nó THẬT SỰ vừa được ghi.
- **Thua** (`.length === 0`): KHÔNG trả `type` mà client vừa gửi — làm vậy là nói dối `effectiveInteraction` (tên trường tự hứa "giá trị đang có hiệu lực"). Làm thêm **một SELECT phụ** (round-trip thứ hai, CHỈ xảy ra ở nhánh hiếm — phần lớn request không đụng độ, không trả tiền cho round-trip này) để lấy đúng giá trị thật.

**Đây là lần đầu `.returning()` được gọi BÊN TRONG `db.batch([...])` ở dự án này.** Đã đọc `node_modules/drizzle-orm/batch.d.ts`:

```ts
export type BatchResponse<T extends BatchItem[] | readonly BatchItem[]> = {
    [K in keyof T]: T[K]['_']['result'];
};
```

`BatchResponse` map TỪNG phần tử của tuple sang `_.result` RIÊNG của nó — nghĩa là kiểu trả về giữ nguyên `.returning()` cho từng statement, type-safe theo đúng vị trí trong mảng. Tin vào kiểu là đủ để viết code, nhưng **integration test (§7) là bằng chứng thật** — đây là mẫu hình mới, không phải chỗ chỉ tin `tsc`.

---

# 4. Quyết định phạm vi: KHÔNG áp cùng cơ chế cho UNDO

`TC-106` chỉ nói "2 Swipe". Áp cùng logic cho UNDO (một request Undo tới sớm hơn một Swipe theo ý định người dùng) đòi phân biệt hai lý do "DELETE không khớp dòng nào":

1. Chưa từng có dòng nào (bình thường, `TC-051` đã dựa đúng vào việc này — DELETE khớp 0 dòng KHÔNG phải lỗi).
2. Dòng hiện tại MỚI hơn thời điểm Undo (thua race thật — cần đọc lại giá trị thật, y hệt nhánh Swipe).

Không có TC nào đòi phân biệt hai ca này cho UNDO. Thêm nhánh đó là mở rộng ngoài DoD, không phải sửa một lỗi đã biết. **Không làm ở slice này** — ghi rõ đây là giới hạn đã biết (§8), không phải bỏ sót.

---

# 5. File tree

```
src/features/selection/
  application/
    selection-repository.ts        SỬA (+ clientTimestamp trong applyInteraction)
    record-interaction.ts / .test.ts   SỬA (+ clientTimestamp)
  infrastructure/
    drizzle-selection-repository.ts    SỬA (onConflictDoUpdate + setWhere)
    drizzle-selection-repository.integration.test.ts   SỬA (TC-106)
  presentation/components/
    send-interaction.ts / .test.ts     SỬA (+ clientTimestamp cố định qua mọi lần retry)

src/app/api/sessions/[id]/interactions/route.ts   SỬA (+ validate clientTimestamp)
```

Không đụng `deck-screen.tsx` — nó gọi `sendInteractionWithRetry(sessionId, {dishId, action}, onStatusChange)` mà không biết gì về `clientTimestamp`; tham số đó chỉ cần thêm BÊN TRONG `send-interaction.ts`, không lộ ra ngoài.

---

# 6. `SelectionRepository`/`record-interaction.ts` — thêm `clientTimestamp`

## 6.1 Port

```ts
export interface SelectionRepository {
  // ...các method khác giữ nguyên...

  /**
   * SPEC-012 + R-04. `clientTimestamp` là mốc THỜI ĐIỂM NGƯỜI DÙNG THAO TÁC
   * (client báo lên) — KHÁC `interactions.updatedAt` cũ vốn là "lúc server xử
   * lý". Đây là thay đổi ngữ nghĩa có chủ ý của cột đó — xem Decision Log
   * DEC-038.
   */
  applyInteraction(input: {
    sessionId: string
    participantId: string
    groupDishId: string
    action: InteractionAction
    clientTimestamp: Date
  }): Promise<InteractionType | null>
}
```

## 6.2 `record-interaction.ts` — SỬA

```ts
export type RecordInteractionInput = {
  readonly sessionId: string
  readonly userId: string
  readonly groupDishId: string
  readonly action: InteractionAction
  readonly clientTimestamp: Date
}

export async function recordInteraction(
  deps: RecordInteractionDeps,
  input: RecordInteractionInput,
): Promise<Result<{ effectiveInteraction: InteractionType | null }, Failure>> {
  const sessionState = await deps.selection.findSessionState(input.sessionId)
  if (sessionState !== 'ACTIVE') {
    return err(failure('ERR_SESSION_NOT_ACTIVE', { sessionId: input.sessionId }))
  }

  const participant = await deps.selection.findParticipant(input.sessionId, input.userId)
  if (participant === null || participant.state === 'REMOVED') {
    return err(failure('ERR_NOT_PARTICIPANT', { sessionId: input.sessionId }))
  }

  const dishActive = await deps.selection.isDishActiveInSession(input.sessionId, input.groupDishId)
  if (!dishActive) {
    return err(failure('ERR_DISH_NOT_IN_POOL', { groupDishId: input.groupDishId }))
  }

  const effectiveInteraction = await deps.selection.applyInteraction({
    sessionId: input.sessionId,
    participantId: participant.id,
    groupDishId: input.groupDishId,
    action: input.action,
    clientTimestamp: input.clientTimestamp,   // + MỚI, xuyên thẳng
  })

  return ok({ effectiveInteraction })
}
```

**Không thêm validate `clientTimestamp` ở đây** — Route Handler (§8) validate ISO string trước khi tới use case, đúng khuôn `dishId`/`action` hiện có (use case luôn nhận input đã sạch, đúng kiểu). Ba bước kiểm bất biến (session/participant/dish) giữ nguyên thứ tự, không đụng.

## 6.3 Test — mở rộng `record-interaction.test.ts`

Thêm `clientTimestamp: new Date('2026-08-19T10:00:00Z')` vào mọi input của test đã có (để còn biên dịch), và:

```ts
it('xuyên clientTimestamp xuống applyInteraction nguyên vẹn', async () => {
  const applyInteraction = vi.fn(async () => 'SWIPE_RIGHT' as const)
  const deps = makeDeps({ applyInteraction }) // ...findSessionState ACTIVE, participant ACTIVE, dish active...
  const clientTimestamp = new Date('2026-08-19T10:00:00Z')

  await recordInteraction(deps, {
    sessionId: 's1',
    userId: 'u1',
    groupDishId: 'gd1',
    action: 'SWIPE_RIGHT',
    clientTimestamp,
  })

  expect(applyInteraction).toHaveBeenCalledWith(
    expect.objectContaining({ clientTimestamp }),
  )
})
```

---

# 7. Infra `drizzle-selection-repository.ts` — SỬA

```ts
async function applyInteraction(input: {
  sessionId: string
  participantId: string
  groupDishId: string
  action: InteractionAction
  clientTimestamp: Date
}): Promise<InteractionType | null> {
  const db = getDb()

  if (input.action === 'UNDO') {
    // KHÔNG đổi — xem Implementation Guide §4 cho lý do UNDO không được
    // timestamp-guard ở slice này.
    await db.batch([
      db
        .delete(interactions)
        .where(
          and(
            eq(interactions.sessionId, input.sessionId),
            eq(interactions.participantId, input.participantId),
            eq(interactions.groupDishId, input.groupDishId),
          ),
        ),
      db.insert(interactionEvents).values({
        id: uuidv7(),
        sessionId: input.sessionId,
        participantId: input.participantId,
        groupDishId: input.groupDishId,
        action: 'UNDO',
      }),
    ])
    return null
  }

  const type: InteractionType = input.action

  /**
   * R-04, TC-106 — `setWhere` chặn UPDATE nếu dòng đang lưu MỚI hơn
   * `clientTimestamp` này. `.returning()` trả rỗng khi bị chặn — KHÔNG phải
   * lỗi. `interactionEvents` vẫn ghi audit log dù bị chặn (DEC-025 — mọi
   * request đều để lại vết, kể cả bị từ chối).
   */
  const [upserted] = await db.batch([
    db
      .insert(interactions)
      .values({
        id: uuidv7(),
        sessionId: input.sessionId,
        participantId: input.participantId,
        groupDishId: input.groupDishId,
        type,
        updatedAt: input.clientTimestamp,
      })
      .onConflictDoUpdate({
        target: [interactions.sessionId, interactions.participantId, interactions.groupDishId],
        set: { type, updatedAt: input.clientTimestamp },
        setWhere: sql`${interactions.updatedAt} < ${input.clientTimestamp}`,
      })
      .returning({ type: interactions.type }),
    db.insert(interactionEvents).values({
      id: uuidv7(),
      sessionId: input.sessionId,
      participantId: input.participantId,
      groupDishId: input.groupDishId,
      action: input.action,
    }),
  ])

  if (upserted !== undefined) {
    // Thắng — dòng vừa ghi CHÍNH LÀ giá trị hiệu lực.
    return upserted.type
  }

  // Thua race hiếm: một request khác (có clientTimestamp mới hơn) đã tới
  // trước, dù có thể tới SAU về mặt mạng. Đọc lại giá trị THẬT — KHÔNG trả
  // `type` mà request này vừa gửi, vì đó không còn là giá trị hiệu lực.
  const current = await db
    .select({ type: interactions.type })
    .from(interactions)
    .where(
      and(
        eq(interactions.sessionId, input.sessionId),
        eq(interactions.participantId, input.participantId),
        eq(interactions.groupDishId, input.groupDishId),
      ),
    )
    .limit(1)

  return current[0]?.type ?? null
}
```

Import thêm `sql` từ `drizzle-orm` ở đầu file (chưa có, các method khác trong file này chỉ dùng `and`/`eq`).

## 7.1 Integration test — mở rộng `drizzle-selection-repository.integration.test.ts`

```ts
it('TC-106 — bản đến sau có clientTimestamp CŨ hơn bị bỏ qua, giữ bản mới hơn', async () => {
  // dựng session ACTIVE, participant, một group_dish ACTIVE — như các test khác trong file
  const newer = new Date('2026-08-19T10:00:05Z')
  const older = new Date('2026-08-19T10:00:00Z')

  // Request "mới hơn" tới server TRƯỚC (giả lập network jitter: request có
  // clientTimestamp SỚM hơn lại ĐẾN sau — đây chính là kịch bản TC-106).
  const first = await drizzleSelectionRepository.applyInteraction({
    sessionId: session.id,
    participantId: participant.id,
    groupDishId: dish.id,
    action: 'SWIPE_RIGHT',
    clientTimestamp: newer,
  })
  const second = await drizzleSelectionRepository.applyInteraction({
    sessionId: session.id,
    participantId: participant.id,
    groupDishId: dish.id,
    action: 'SWIPE_LEFT',
    clientTimestamp: older,   // ĐẾN SAU nhưng Ý ĐỊNH cũ hơn
  })

  expect(first).toBe('SWIPE_RIGHT')
  expect(second).toBe('SWIPE_RIGHT')   // ← KHÔNG phải 'SWIPE_LEFT' — bản cũ bị bỏ qua

  const db = getDb()
  const rows = await db.select().from(interactions).where(eq(interactions.groupDishId, dish.id))
  expect(rows).toHaveLength(1)
  expect(rows[0]?.type).toBe('SWIPE_RIGHT')   // DB thật giữ đúng bản mới hơn

  const events = await db.select().from(interactionEvents).where(eq(interactionEvents.groupDishId, dish.id))
  expect(events).toHaveLength(2)   // cả hai request đều để lại vết audit, kể cả bản bị từ chối
})

it('request bình thường (không đụng độ): vẫn ghi và trả đúng type, không round-trip thừa', async () => {
  const result = await drizzleSelectionRepository.applyInteraction({
    sessionId: session.id,
    participantId: participant.id,
    groupDishId: dish.id,
    action: 'SWIPE_RIGHT',
    clientTimestamp: new Date(),
  })

  expect(result).toBe('SWIPE_RIGHT')
})
```

Test đầu tiên là bằng chứng thật cho `TC-106` — không phải mock, chạy trên Neon branch `test` thật, xác nhận cả `interactions` (effective state) lẫn `interactionEvents` (audit log) đều đúng.

---

# 8. Route Handler `app/api/sessions/[id]/interactions/route.ts` — SỬA

```ts
const clientTimestampRaw =
  typeof body === 'object' && body !== null
    ? (body as Record<string, unknown>)['clientTimestamp']
    : undefined

const clientTimestamp = typeof clientTimestampRaw === 'string' ? new Date(clientTimestampRaw) : null

if (
  typeof dishId !== 'string' ||
  dishId === '' ||
  !isValidAction(action) ||
  clientTimestamp === null ||
  Number.isNaN(clientTimestamp.getTime())
) {
  return Response.json({ code: 'ERR_VALIDATION' }, { status: httpStatusForErrorCode('ERR_VALIDATION') })
}

const result = await recordInteraction(
  { selection: drizzleSelectionRepository },
  { sessionId, userId: user.id, groupDishId: dishId, action, clientTimestamp },
)
```

Gộp điều kiện validate vào ĐÚNG khối `if` đã có (`dishId`/`action`) — không tách thành hai khối `if` riêng, giữ đúng phong cách "một cổng validate, một mã lỗi" đã có trong file.

---

# 9. `send-interaction.ts` — SỬA

```ts
export async function sendInteractionWithRetry(
  sessionId: string,
  input: { dishId: string; action: InteractionAction },
  onStatusChange: (status: SendInteractionStatus) => void,
): Promise<SendInteractionResult> {
  // Capture MỘT LẦN, TRƯỚC vòng lặp retry — mọi lần thử lại gửi lại ĐÚNG mốc
  // thời gian gốc. Retry là gửi lại CÙNG một hành động đã xảy ra, không phải
  // tạo ra một hành động mới mỗi lần thử — nếu mỗi lần retry tự lấy
  // `new Date()` mới, một request bị delay 4 giây (qua cả 3 lần retry) sẽ tự
  // báo cáo thời điểm SAI, làm hỏng chính cơ chế mà E4-T5 vừa dựng.
  const clientTimestamp = new Date().toISOString()

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, clientTimestamp }),
      })

      // ...phần còn lại giữ nguyên...
```

## 9.1 Test — mở rộng `send-interaction.test.ts`

```ts
it('gửi kèm clientTimestamp, GIỮ NGUYÊN qua các lần retry', async () => {
  let capturedTimestamps: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((_url, options) => {
      const body = JSON.parse((options as { body: string }).body)
      capturedTimestamps.push(body.clientTimestamp)
      return Promise.resolve({ ok: false, status: 503 }) // buộc retry
    }),
  )

  await sendInteractionWithRetry('s1', { dishId: 'd1', action: 'SWIPE_RIGHT' }, vi.fn())

  expect(new Set(capturedTimestamps).size).toBe(1) // MỌI lần gửi cùng một giá trị
  vi.unstubAllGlobals()
})
```

---

# 10. Rủi ro

| Rủi ro | Hậu quả | Giảm thiểu |
| --- | --- | --- |
| `.returning()` bên trong `db.batch()` không hoạt động như kiểu hứa hẹn trên driver `neon-http` thật | `TC-106` xanh giả (mock qua được) nhưng dữ liệu thật sai | §7.1 — integration test thật trên Neon branch `test`, không chỉ tin `tsc` |
| Quên đổi `updatedAt` từ `new Date()` (server time) sang `input.clientTimestamp` ở CẢ HAI chỗ (`values` và `set`) | Dòng đầu tiên (INSERT, không đụng độ) vẫn dùng server time, dòng update dùng client time — hai nguồn sự thật lẫn lộn trong cùng một cột | Cả `values` và `onConflictDoUpdate.set` đều dùng `input.clientTimestamp`, §7 |
| `send-interaction.ts` lấy `new Date()` MỚI mỗi lần retry thay vì capture một lần | Request bị delay qua nhiều lần retry tự báo sai thời điểm, làm hỏng chính cơ chế chống ghi đè | Capture trước vòng lặp, có test riêng xác nhận (§9.1) |
| Áp nhầm timestamp-guard cho UNDO "cho nhất quán" | Thêm độ phức tạp không TC nào đòi, có thể phá `TC-051` nếu làm ẩu | Quyết định rõ ràng ở §4 — không làm |

---

# 11. Test Cases coverage

| TC | Mô tả | Tầng | Nơi test |
|---|---|---|---|
| `TC-106` | 2 Swipe cùng món, bản đến sau có timestamp cũ hơn → bị bỏ qua | `A` (Master Plan) / thực chất `I` vì cần DB thật kiểm chứng hành vi `onConflictDoUpdate...setWhere` | `drizzle-selection-repository.integration.test.ts` |

---

# 12. Thứ tự TDD

1. `record-interaction.test.ts` (thêm `clientTimestamp` vào input hiện có, thêm ca xuyên tham số) → `record-interaction.ts`
2. `selection-repository.ts` (port — thêm field, không test riêng)
3. `drizzle-selection-repository.integration.test.ts` (TC-106, §7.1) → `applyInteraction` trong infra (§7)
4. Route Handler (§8)
5. `send-interaction.test.ts` (§9.1) → `send-interaction.ts` (§9)
6. `yarn verify && yarn arch:probe && yarn test:integration`

---

# 13. Verify

## 13.1 Cổng máy

```bash
yarn verify && yarn arch:probe
yarn test:integration
```

Không có gì mới ở `yarn arch:probe` slice này — không đổi ranh giới feature nào, chỉ thêm tham số xuyên các tầng đã có.

## 13.2 Bằng chứng TC-106 — cách duy nhất đáng tin là DB thật

Test §7.1 đã là bằng chứng chính. Nếu muốn nhìn tận mắt qua UI:

1. `yarn dev`, mở deck, chuẩn bị DevTools → Network → có thể giả lập độ trễ (Slow 3G) để dễ tạo race thật.
2. Vuốt phải rồi LẬP TỨC vuốt trái (undo ý định, không phải nút Undo — nghĩa là đổi ý ngay khi thẻ tiếp theo hiện, quay lại vuốt cùng món qua một đường khác nếu UI cho phép, hoặc kiểm tra trực tiếp qua `db:studio` sau khi gọi API hai lần liên tiếp bằng tay).
3. Cách chắc chắn nhất: gọi thẳng Route Handler hai lần bằng `curl`/REPL với `clientTimestamp` cố ý ngược thứ tự gửi, rồi `db:studio` → `interactions` xác nhận dòng cuối cùng đúng là bản có `clientTimestamp` MỚI hơn, bất kể thứ tự gọi.

## 13.3 Xác nhận E4-T6 đạt DoD mà không cần code mới

Tắt Wi-Fi giữa lúc vuốt (đã kiểm được từ E1-T9, nhắc lại ở đây vì đó là DoD của T6): dải `bg-warning-soft` hiện `"Đang thử gửi lại · bạn vuốt tiếp được"`, vuốt tiếp vẫn ghi nhận cục bộ (optimistic), bật lại mạng → tự gửi lại thành công.

---

# 14. Decision Log — thêm vào `docs/what-we-gonna-eat-today_decision-log_v3.9.md`

```markdown
# DEC-038 — Interaction Ordering Uses Client-Reported Timestamp, Not Server Arrival Order

**Ngày quyết định:** 2026-08-19 | **Trạng thái:** Accepted

## Quyết định

`interactions.updated_at` now stores the CLIENT's reported action timestamp
(`clientTimestamp`, captured at gesture-commit time), not the server's
processing time. `applyInteraction`'s upsert uses
`ON CONFLICT ... DO UPDATE ... WHERE updated_at < clientTimestamp` — a single
SQL statement, no read-then-write — to reject writes whose reported intent is
older than what's already stored, regardless of network arrival order.

## Rationale

SPEC-012's formal input (`{ sessionId, dishId, action }`) has no timestamp
field, but TC-106 and R-04 require rejecting a write when the ARRIVING request
represents an OLDER user intent than one already applied — a distinction the
server cannot make from arrival order alone. This is the same class of gap as
DEC-030-style spec omissions: a parameter genuinely necessary for the stated
DoD, absent from the formal contract, added by necessity.

Only SWIPE_RIGHT/SWIPE_LEFT are guarded this way. UNDO keeps its original
unconditional delete — extending the guard there requires distinguishing "no
row ever existed" from "a newer row exists," which TC-106 does not test and
no other TC requires.

## Consequence

A client can only affect the ordering of its OWN swipes on a dish it
controls (the unique constraint is per session+participant+dish) — a
malicious or buggy client can at most confuse its own deck state, not another
participant's. `interaction_events.created_at` remains server-generated and is
the accurate audit trail of processing order if ever needed independently of
`clientTimestamp`.

## Affected Documents

- SDD SPEC-012 (documents the gap; input contract not edited in place)
```

---

# 15. Master Plan

Sau khi `yarn verify`/`yarn arch:probe`/`yarn test:integration` xanh và §13.2/§13.3 đã kiểm tay: tick `E4-T5` và `E4-T6` ở §6.
