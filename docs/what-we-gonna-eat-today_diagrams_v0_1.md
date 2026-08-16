# Diagrams — What We Gonna Eat Today

## Version 0.1

**Status:** Draft — Awaiting review
**Created:** 2026-08-14
**Upstream:** Tech Spec & Architecture v0.1, SDD v0.2, Business Rules v1.6

Phạm vi: **v1.0 — 17 tính năng**. Sơ đồ không mô tả các tính năng ở v1.1 và v1.2.

Tất cả bằng Mermaid để render được trên GitHub và diff được bằng git. Bốn sơ đồ nằm chung một file thay vì tách thư mục, để thống nhất với bộ tài liệu phẳng hiện có của dự án.

C4 chỉ có Context và Container. Component và Code bị bỏ: tầng Code chính là source code, còn Component sẽ lỗi thời trong tuần đầu tiên. Cả hai sơ đồ C4 dùng `flowchart` thay cú pháp `C4Context`, vì cú pháp C4 của Mermaid hay hỏng ở một số nơi render.

---

# 1. C4 — Context

Dùng để quyết định: hệ thống phụ thuộc vào cái gì bên ngoài, và ai chạm vào nó.

```mermaid
flowchart TB
    creator["Người tổ chức bữa ăn<br/>Creator, Group Admin"]
    member["Thành viên<br/>Participant"]
    app["What We Gonna Eat Today<br/>Next.js trên Vercel"]
    google["Google OAuth<br/>nhà cung cấp định danh"]
    neon["Neon Postgres<br/>free tier"]

    creator -->|"Mở phiên, chốt bữa · HTTPS"| app
    member -->|"Vuốt chọn món · HTTPS"| app
    app -->|"Xác thực · OIDC"| google
    app -->|"Đọc/ghi · SQL"| neon
```

Chỉ có hai phụ thuộc ngoài. Không có dịch vụ thanh toán, không có email, không có thông báo đẩy, không có lưu trữ file. Mỗi mũi tên thêm vào sơ đồ này là một thứ có thể hỏng lúc 6 giờ chiều khi cả nhà đang chờ.

---

# 2. C4 — Container

Dùng để quyết định: cái gì chạy ở đâu, và ranh giới nào không được vượt.

```mermaid
flowchart TB
    subgraph browser["Trình duyệt điện thoại"]
        ui["React Client Components<br/>giao diện vuốt, optimistic update"]
    end

    subgraph vercel["Vercel"]
        rsc["React Server Components<br/>deck, Session Ranking"]
        actions["Server Actions<br/>mọi mutation trừ swipe"]
        route["Route Handler<br/>POST /api/sessions/:id/interactions"]
        authr["Auth.js route<br/>đăng nhập, phiên cookie"]
    end

    subgraph neon["Neon"]
        pg[("Postgres<br/>14 bảng")]
    end

    google["Google OAuth"]

    ui -->|"gọi"| actions
    ui -->|"fetch song song"| route
    ui -.->|"nhận HTML đã render"| rsc
    rsc --> pg
    actions --> pg
    route --> pg
    authr --> google
    authr --> pg
```

Quyết định duy nhất đáng vẽ ở đây: **swipe đi qua Route Handler riêng, không qua Server Action.** React serialise các Server Action liên tiếp, còn NFR-02 yêu cầu phản hồi dưới 100ms khi người dùng vuốt liên tục. Mọi mutation khác đi qua Server Action vì chúng thưa và không cần song song.

---

# 3. ERD

Dùng để quyết định: dữ liệu nào là nguồn sự thật, và ràng buộc nào do database ép chứ không do code.

```mermaid
erDiagram
    USERS ||--o{ GROUP_MEMBERS : "thuộc về"
    GROUPS ||--o{ GROUP_MEMBERS : "có"
    GROUPS ||--o{ GROUP_INVITES : "phát hành"
    GROUPS ||--o{ GROUP_DISHES : "sở hữu pool"
    GLOBAL_DISHES ||--o{ GROUP_DISHES : "được tham chiếu bởi"
    GROUP_DISHES ||--o{ GROUP_DISH_TAGS : "mang"
    GROUPS ||--o{ GROUP_RULES : "cấu hình"
    GROUPS ||--o{ SELECTION_SESSIONS : "tổ chức"
    SELECTION_SESSIONS ||--o{ SESSION_RULES : "snapshot"
    SELECTION_SESSIONS ||--o{ PARTICIPANTS : "gồm"
    USERS ||--o{ PARTICIPANTS : "tham gia"
    PARTICIPANTS ||--o{ INTERACTIONS : "tạo"
    GROUP_DISHES ||--o{ INTERACTIONS : "nhận"
    SELECTION_SESSIONS ||--o{ INTERACTION_EVENTS : "ghi nhật ký"
    SELECTION_SESSIONS ||--o{ SESSION_DECKS : "materialize"
    USERS ||--o{ SESSION_DECKS : "sở hữu"
    SELECTION_SESSIONS ||--o| FINAL_MEALS : "kết thúc bằng"
    FINAL_MEALS ||--o{ FINAL_MEAL_ITEMS : "gồm"
    GROUP_DISHES ||--o{ FINAL_MEAL_ITEMS : "xuất hiện trong"
    FINAL_MEALS ||--o{ EATING_HISTORY : "sinh ra"
    USERS ||--o{ EATING_HISTORY : "sở hữu"
    GLOBAL_DISHES ||--o{ EATING_HISTORY : "được ghi nhận"

    USERS {
        uuid id PK
        text provider
        text provider_subject
        text email
        text display_name
    }
    GROUPS {
        uuid id PK
        text name
        text timezone
    }
    GROUP_MEMBERS {
        uuid id PK
        uuid group_id FK
        uuid user_id FK
        boolean is_admin
        timestamptz removed_at
    }
    GROUP_INVITES {
        uuid id PK
        uuid group_id FK
        text token_hash
        timestamptz expires_at
        timestamptz used_at
    }
    GLOBAL_DISHES {
        uuid id PK
        text name
        text normalized_name
        uuid created_by_user_id FK
        uuid created_from_group_id FK
    }
    GROUP_DISHES {
        uuid id PK
        uuid group_id FK
        uuid global_dish_id FK
        text state
    }
    GROUP_DISH_TAGS {
        uuid group_dish_id PK
        text system_tag PK
    }
    GROUP_RULES {
        uuid id PK
        uuid group_id FK
        text system_tag
        int minimum_count
        text rule_type
        boolean overridable
    }
    SELECTION_SESSIONS {
        uuid id PK
        uuid group_id FK
        date decision_date
        uuid creator_user_id FK
        text state
        timestamptz started_at
        timestamptz finalized_at
    }
    SESSION_RULES {
        uuid id PK
        uuid session_id FK
        text system_tag
        int minimum_count
        text rule_type
    }
    PARTICIPANTS {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        text state
    }
    INTERACTIONS {
        uuid id PK
        uuid session_id FK
        uuid participant_id FK
        uuid group_dish_id FK
        text type
        timestamptz updated_at
    }
    INTERACTION_EVENTS {
        uuid id PK
        uuid session_id FK
        uuid participant_id FK
        uuid group_dish_id FK
        text action
        timestamptz created_at
    }
    SESSION_DECKS {
        uuid session_id PK
        uuid user_id PK
        jsonb ordered_dish_ids
    }
    FINAL_MEALS {
        uuid id PK
        uuid session_id FK
        timestamptz created_at
    }
    FINAL_MEAL_ITEMS {
        uuid final_meal_id PK
        uuid group_dish_id PK
    }
    EATING_HISTORY {
        uuid id PK
        uuid user_id FK
        uuid global_dish_id FK
        date eating_date
        uuid source_final_meal_id FK
    }
```

## 3.1 Ràng buộc bắt nguồn từ business rule

| Ràng buộc | Nguồn | Ép ở đâu |
|---|---|---|
| Unique một phần trên `(group_id, decision_date)` khi `state in (ACTIVE, FINALIZED)` | BR-025 | Database |
| `unique(group_id, rule_type, system_tag)` | BR-012 | Database |
| `check(minimum_count >= 1)` trên cả `group_rules` và `session_rules` | BR-012 | Database |
| `unique(session_id, participant_id, group_dish_id)` trên `interactions` | BR-040 | Database |
| `primary key(final_meal_id, group_dish_id)` — một Dish một lần trong Final Meal | BR-050 | Database |
| `unique(group_id, global_dish_id)` trên `group_dishes` | BR-005 | Database |
| `unique(session_id)` trên `final_meals` — tối đa một Final Meal mỗi Session | BR-025 | Database |
| Participant phải là Group Member | BR-026 | Application, vì membership có thể bị gỡ sau khi tham gia |
| Mọi Dish trong Final Meal phải Active lúc finalize | BR-050 | Application, kiểm tra lại tại SPEC-016 bước 4 |

Chín ràng buộc, bảy trong số đó do database ép. Đây là chủ ý: ràng buộc do code ép sẽ bị bỏ sót ở đường đi thứ hai, còn ràng buộc do database ép thì không.

## 3.2 Ba chỗ lệch so với Tech Spec v0.1

Đối chiếu ERD với mô hình dữ liệu ở Tech Spec §3.1 và từ vựng ở Business Rules, tôi thấy ba chỗ cần sửa. Chúng chưa được áp dụng vào Tech Spec, chờ bạn duyệt.

**1. Đổi tên bảng `sessions` thành `selection_sessions`.**
Business Rules gọi thực thể này là Selection Session. Quan trọng hơn, `sessions` là tên Auth.js dùng cho phiên đăng nhập; v1.0 chọn chiến lược JWT nên chưa có bảng đó, nhưng nếu sau này đổi sang database session thì va tên ngay. Đổi bây giờ tốn một dòng, đổi sau tốn một migration.

**2. Bỏ `group_id` và `decision_date` khỏi `final_meals`.**
Tech Spec §3.1 để hai cột này, nhưng cả hai đều suy ra được từ `selection_sessions` qua `session_id`. Dữ liệu trùng lặp sẽ lệch nhau vào một ngày nào đó, và không có ràng buộc nào giữ chúng đồng bộ. `eating_history.eating_date` thì phải giữ, vì nó là dữ liệu ở cấp User và được Personal Correction sửa độc lập từ v1.1.

**3. Bỏ cột `invalid_reason` khỏi `selection_sessions` ở v1.0.**
Trạng thái `INVALID` không thể tới được ở v1.0 vì F26 timeout và F41 cancel đều ở v1.2. Giữ giá trị `INVALID` trong enum thì hợp lý — nó mô tả máy trạng thái đầy đủ và không tốn gì. Nhưng cột `invalid_reason` là cột chết, và nó vi phạm đúng nguyên tắc đã dùng để loại `is_chef` ở Tech Spec §3.2.

---

# 4. Flowchart — Vòng đời Selection Session

Dùng để quyết định: một phiên có thể kết thúc ở những trạng thái nào, và cái gì chặn nó ở mỗi bước.

Nhánh lỗi được vẽ đầy đủ. Sơ đồ chỉ có happy path không giúp ai quyết định gì.

```mermaid
flowchart TD
    start([Creator mở phiên]) --> chk1{"Đã có Session<br/>ACTIVE hoặc FINALIZED<br/>hôm nay?"}
    chk1 -->|Có| e1["ERR_SESSION_EXISTS_TODAY<br/>chỉ tới phiên đang chạy"]
    chk1 -->|Không| draft["DRAFT<br/>Creator là Participant"]

    draft --> addp["Thêm Participant<br/>SPEC-009"]
    addp --> draft
    draft --> startbtn["Creator bấm Start"]

    startbtn --> v1{"Creator còn là<br/>Group Member?"}
    v1 -->|Không| e2["ERR_NOT_GROUP_MEMBER<br/>giữ DRAFT"]
    v1 -->|Có| v2{"Mọi Participant<br/>còn là Member?"}
    v2 -->|Không| e3["ERR_PARTICIPANT_NOT_MEMBER<br/>kèm danh sách · giữ DRAFT"]
    v2 -->|Có| v3{"Uniqueness còn<br/>hợp lệ?"}
    v3 -->|Không| e1
    v3 -->|Có| snap["Snapshot Session Rule<br/>SPEC-022"]

    snap --> active["ACTIVE<br/>Participant bắt đầu vuốt"]

    active --> swipe["Vuốt, Undo, Completed<br/>SPEC-012 · SPEC-013"]
    swipe --> active
    active --> compose["Creator dựng Final Meal<br/>SPEC-015"]
    compose --> active

    active --> fin["Creator bấm Finalize"]
    fin --> f1{"Nháp có món?"}
    f1 -->|Không| e4["ERR_EMPTY_FINAL_MEAL<br/>giữ ACTIVE"]
    f1 -->|Có| f2{"Mọi Dish còn Active<br/>trong Group Dish Pool?"}
    f2 -->|Không| e5["ERR_DISH_NOT_IN_POOL<br/>giữ ACTIVE"]
    f2 -->|Có| f3{"Required Rule<br/>đều đạt?"}
    f3 -->|Không| e6["ERR_REQUIRED_RULE_FAILED<br/>nêu rule thiếu · giữ ACTIVE"]
    f3 -->|Có| done["FINALIZED<br/>sinh Eating History<br/>cùng transaction"]

    done --> stop([Không reopen])

    e2 --> draft
    e3 --> draft
    e4 --> active
    e5 --> active
    e6 --> active

    invalid["INVALID<br/>chưa tới được ở v1.0"]
    active -.->|"F26 timeout · F41 cancel<br/>từ v1.2"| invalid

    style invalid stroke-dasharray: 5 5
    style e1 fill:#fdd,stroke:#c66
    style e2 fill:#fdd,stroke:#c66
    style e3 fill:#fdd,stroke:#c66
    style e4 fill:#fdd,stroke:#c66
    style e5 fill:#fdd,stroke:#c66
    style e6 fill:#fdd,stroke:#c66
```

Điều đáng chú ý nhất trong sơ đồ này: **mọi nhánh lỗi đều quay về trạng thái cũ.** Không có trạng thái `ValidationFailed`, không có phiên nào bị kẹt ở giữa. Đây là DEC-011 được vẽ ra, và nó là lý do máy trạng thái chỉ có bốn ô thay vì bảy.

Đường đứt nét tới `INVALID` cho thấy phần máy trạng thái chưa dùng được ở v1.0. Một phiên mở hôm nay sẽ ở `ACTIVE` vĩnh viễn nếu không ai chốt.

---

# 5. Sequence — Finalize

Dùng để quyết định: ranh giới tầng nào bị vượt qua ở luồng phức tạp nhất, và giao dịch bao trùm những gì.

Vẽ cho Finalize vì đây là chỗ duy nhất trong v1.0 mà bốn feature chạm nhau — `meal`, `rule`, `session`, `history` — và là chỗ duy nhất có transaction nhiều bảng.

```mermaid
sequenceDiagram
    autonumber
    actor C as Creator
    participant UI as React Client
    participant SA as Server Action<br/>presentation
    participant UC as FinalizeMeal<br/>application
    participant DOM as RuleEvaluator<br/>domain
    participant REPO as Repository<br/>infrastructure
    participant DB as Postgres

    C->>UI: Bấm Finalize
    UI->>SA: finalizeMeal(sessionId)
    SA->>UC: execute(sessionId, userId)

    UC->>REPO: loadSession(sessionId)
    REPO->>DB: SELECT selection_sessions
    DB-->>REPO: session
    REPO-->>UC: Session

    alt state khác ACTIVE
        UC-->>SA: Failure(ERR_SESSION_NOT_ACTIVE)
        SA-->>UI: hiển thị lỗi
    end

    alt userId khác creator
        UC-->>SA: Failure(ERR_NOT_SESSION_CREATOR)
        SA-->>UI: hiển thị lỗi
    end

    UC->>REPO: loadDraftItems(sessionId)
    REPO->>DB: SELECT final_meal_items nháp
    DB-->>REPO: dishIds
    REPO-->>UC: dishIds

    alt nháp rỗng
        UC-->>SA: Failure(ERR_EMPTY_FINAL_MEAL)
        SA-->>UI: hiển thị lỗi
    end

    UC->>REPO: loadActiveDishesWithTags(groupId, dishIds)
    Note over REPO,DB: System Tag lấy hiện tại,<br/>không snapshot theo Session · BR-052
    REPO->>DB: SELECT group_dishes + group_dish_tags
    DB-->>REPO: dishes
    REPO-->>UC: dishes

    alt có Dish không còn Active
        UC-->>SA: Failure(ERR_DISH_NOT_IN_POOL)
        SA-->>UI: hiển thị lỗi
    end

    UC->>REPO: loadSessionRules(sessionId)
    REPO->>DB: SELECT session_rules
    DB-->>REPO: rules
    REPO-->>UC: rules

    UC->>DOM: evaluateRequired(dishes, rules)
    Note over DOM: Hàm thuần · independent tag counting<br/>một Dish thoả nhiều Tag cùng lúc
    DOM-->>UC: pass hoặc danh sách rule thiếu

    alt có Required Rule fail
        UC-->>SA: Failure(ERR_REQUIRED_RULE_FAILED, rule thiếu)
        SA-->>UI: nêu rõ thiếu gì
        Note over UI: Session vẫn ACTIVE
    end

    UC->>REPO: commitFinalize(session, dishes, participants)
    REPO->>DB: BEGIN
    REPO->>DB: INSERT final_meals
    REPO->>DB: INSERT final_meal_items
    REPO->>DB: INSERT eating_history cho từng Participant × Dish
    REPO->>DB: UPDATE selection_sessions SET state = FINALIZED
    REPO->>DB: COMMIT
    DB-->>REPO: ok
    REPO-->>UC: FinalMeal
    UC-->>SA: Success(FinalMeal)
    SA-->>UI: điều hướng tới màn hình bữa ăn hôm nay
    UI-->>C: Hiển thị Final Meal
```

Ba điều sơ đồ này ép phải đúng:

1. **`RuleEvaluator` nằm ở `domain/` và là hàm thuần.** Nó không chạm database, nhận `dishes` và `rules` làm tham số. Đây là điều kiện để test nó không cần dựng Session — và nó là một trong ba chỗ Tech Spec §8.2 yêu cầu test kỹ nhất.
2. **Bốn lệnh ghi nằm trong một transaction.** Nếu `eating_history` ghi thất bại thì Session không được chuyển sang `FINALIZED`. Không có trạng thái nửa vời nào tồn tại được.
3. **System Tag đọc ở bước gần cuối, không phải lúc dựng nháp.** BR-052 yêu cầu validate bằng tag hiện tại, nên Admin đổi tag lúc 5 giờ chiều sẽ đổi kết quả finalize lúc 6 giờ. Đây là hành vi có chủ ý, không phải lỗi.

---

# 6. Kiểm tra cuối

- Tên gọi thống nhất giữa bốn sơ đồ, Tech Spec §3.1 và từ vựng Business Rules — trừ ba chỗ lệch đã nêu ở §3.2, đang chờ duyệt.
- Cả bốn sơ đồ dùng cú pháp Mermaid phổ biến (`flowchart`, `erDiagram`, `sequenceDiagram`), tránh `C4Context` vì hay hỏng khi render.
- Mỗi sơ đồ có câu mở đầu nói rõ nó dùng để quyết định điều gì.
- Không sơ đồ nào diễn đạt lại code. Sơ đồ nào chỉ vẽ lại cấu trúc thư mục đã bị bỏ.

---

# 7. Change History

| Version | Date | Section | Change | Reason / Decision |
|---|---|---|---|---|
| 0.1 | 2026-08-14 | Toàn bộ | Bản draft đầu tiên: C4 Context/Container, ERD 15 bảng, flowchart vòng đời Session, sequence Finalize | Phase 7 |
