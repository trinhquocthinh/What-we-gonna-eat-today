# 📐 Architecture & System Diagrams — What We Gonna Eat Today

> **Document Metadata**
>
> - **Version:** `1.0` | **Status:** `Approved`
> - **Created:** `2026-08-14` | **Last Updated:** `2026-08-14`
> - **Upstream:** [Tech Spec & Architecture](what-we-gonna-eat-today_tech-spec-architecture_v0_1.md) • [SDD](what-we-gonna-eat-today_sdd_v0_1.md) • [Business Rules](what-we-gonna-eat-today_business-rules_v1.4.md)
> - **Downstream:** [Master Plan](what-we-gonna-eat-today_master-plan_v1_0.md) • [Setup & Ops Guide](what-we-gonna-eat-today_setup-and-ops-guide_v0_1.md)
>
> 📌 *Tài liệu trực quan hóa toàn diện hệ thống What We Gonna Eat Today: Sơ đồ C4 Context & Container, Sơ đồ thực thể quan hệ ERD (15 bảng), Flowchart vòng đời phiên chọn món và Sequence Diagram luồng Finalize.*

---

## 📑 Mục lục (Table of Contents)

1. [Sơ đồ C4 — Bối cảnh hệ thống (System Context)](#1-sơ-đồ-c4--bối-cảnh-hệ-thống-system-context)
2. [Sơ đồ C4 — Vùng chứa & Thành phần (Containers)](#2-sơ-đồ-c4--vùng-chứa--thành-phần-containers)
3. [Sơ đồ thực thể quan hệ (ERD — Entity Relationship Diagram)](#3-sơ-đồ-thực-thể-quan-hệ-erd--entity-relationship-diagram)
   - [3.1 Bảng phân tích các ràng buộc nghiệp vụ](#31-bảng-phân-tích-các-ràng-buộc-nghiệp-vụ)
   - [3.2 Các quyết định đồng bộ Schema](#32-các-quyết-định-đồng-bộ-schema)
4. [Lưu đồ vòng đời phiên chọn món (Session Lifecycle Flowchart)](#4-lưu-đồ-vòng-đời-phiên-chọn-món-session-lifecycle-flowchart)
5. [Sơ đồ tuần tự chốt bữa ăn (Finalize Sequence Diagram)](#5-sơ-đồ-tuần-tự-chốt-bữa-ăn-finalize-sequence-diagram)
6. [Lịch sử thay đổi (Change History)](#6-lịch-sử-thay-đổi-change-history)

---

# 1. Sơ đồ C4 — Bối cảnh hệ thống (System Context)

> **Mục đích:** Xác định rõ các phụ thuộc bên ngoài của hệ thống và các tác nhân tương tác.

```mermaid
flowchart TB
    creator["🧑‍🍳 Người tổ chức bữa ăn<br/>(Creator / Group Admin)"]
    member["🏃 Thành viên gia đình<br/>(Participant)"]
    app["🍲 What We Gonna Eat Today<br/>(Next.js App trên Vercel)"]
    google["🔐 Google OAuth<br/>(Identity Provider / OIDC)"]
    neon["🐘 Neon Postgres<br/>(Serverless Database)"]

    creator -->|"Mở phiên, chọn món, chốt bữa (HTTPS)"| app
    member -->|"Vuốt chọn / từ chối món ăn (HTTPS)"| app
    app -->|"Xác thực người dùng (OIDC / JWT)"| google
    app -->|"Đọc / ghi dữ liệu qua SQL (Drizzle ORM)"| neon
```

> [!NOTE]
> Hệ thống chỉ duy trì **2 phụ thuộc ngoại vi cốt lõi**: Google OAuth (định danh) và Neon Postgres (lưu trữ). Không có dịch vụ thanh toán, không email, không push notification thừa thãi nhằm đảm bảo độ tin cậy tối đa lúc 6 giờ chiều khi cả nhà đang chờ cơm.

---

# 2. Sơ đồ C4 — Vùng chứa & Thành phần (Containers)

> **Mục đích:** Phân định rõ ranh giới thực thi: Thành phần nào chạy ở trình duyệt, thành phần nào chạy trên server và giao tiếp như thế nào.

```mermaid
flowchart TB
    subgraph browser["📱 Trình duyệt điện thoại (Client)"]
        ui["React Client Components<br/>• Thao tác vuốt thẻ 1 tay<br/>• Cập nhật lạc quan (Optimistic UI)"]
    end

    subgraph vercel["⚡ Vercel Serverless Platform"]
        rsc["React Server Components (RSC)<br/>• Render Candidate Deck ban đầu<br/>• Render Session Ranking"]
        actions["Server Actions (Mutation)<br/>• Tạo nhóm, mở phiên, chốt bữa"]
        route["Route Handler (Parallel Swipe)<br/>• POST /api/sessions/:id/interactions"]
        authr["Auth.js Handler<br/>• Đăng nhập Google & Cookie JWT"]
    end

    subgraph neon["🐘 Neon Serverless Database"]
        pg[("PostgreSQL Database<br/>(15 bảng dữ liệu)")]
    end

    google["🔐 Google OAuth"]

    ui -->|"Gọi Mutation thông thường"| actions
    ui -->|"Fetch song song, độ trễ < 100ms"| route
    ui -.->|"Nhận HTML Server Render"| rsc
    rsc --> pg
    actions --> pg
    route --> pg
    authr --> google
    authr --> pg
```

> [!IMPORTANT]
> **Quyết định kiến trúc quan trọng:**  
> Thao tác vuốt thẻ (Swipe) đi qua **Route Handler riêng**, không qua Server Actions để tránh bị nghẽn hàng đợi (serialisation) của React, đáp ứng chỉ số [NFR-02](what-we-gonna-eat-today_prd_v0_1.md) phản hồi dưới 100ms.

---

# 3. Sơ đồ thực thể quan hệ (ERD — Entity Relationship Diagram)

> **Mục đích:** Xác định cấu trúc nguồn sự thật (Single Source of Truth) và các ràng buộc toàn vẹn do Database kiểm soát.

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
        timestamptz created_at
    }
    GROUPS {
        uuid id PK
        text name
        text timezone
        timestamptz created_at
    }
    GROUP_MEMBERS {
        uuid id PK
        uuid group_id FK
        uuid user_id FK
        boolean is_admin
        timestamptz joined_at
        timestamptz removed_at
    }
    GROUP_INVITES {
        uuid id PK
        uuid group_id FK
        text token_hash
        timestamptz expires_at
        timestamptz used_at
        uuid used_by_user_id FK
        timestamptz created_at
    }
    GLOBAL_DISHES {
        uuid id PK
        text name
        text normalized_name
        uuid created_by_user_id FK
        uuid created_from_group_id FK
        timestamptz created_at
    }
    GROUP_DISHES {
        uuid id PK
        uuid group_id FK
        uuid global_dish_id FK
        text state
        timestamptz created_at
    }
    GROUP_DISH_TAGS {
        uuid group_dish_id PK, FK
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
        timestamptz created_at
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
        timestamptz joined_at
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
        uuid session_id PK, FK
        uuid user_id PK, FK
        jsonb ordered_dish_ids
        timestamptz created_at
    }
    FINAL_MEALS {
        uuid id PK
        uuid session_id FK
        timestamptz created_at
    }
    FINAL_MEAL_ITEMS {
        uuid final_meal_id PK, FK
        uuid group_dish_id PK, FK
    }
    EATING_HISTORY {
        uuid id PK
        uuid user_id FK
        uuid global_dish_id FK
        date eating_date
        uuid source_final_meal_id FK
        timestamptz created_at
    }
```

## 3.1 Bảng phân tích các ràng buộc nghiệp vụ

| Ràng buộc toàn vẹn | Nguồn quy tắc | Tầng thực thi |
| :--- | :--- | :---: |
| **Partial Unique:** `(group_id, decision_date)` khi `state IN ('ACTIVE', 'FINALIZED')` | [BR-025](what-we-gonna-eat-today_business-rules_v1.4.md) | **Database** |
| `UNIQUE(group_id, rule_type, system_tag)` | [BR-012](what-we-gonna-eat-today_business-rules_v1.4.md) | **Database** |
| `CHECK(minimum_count >= 1)` trên cả `group_rules` và `session_rules` | [BR-012](what-we-gonna-eat-today_business-rules_v1.4.md) | **Database** |
| `UNIQUE(session_id, participant_id, group_dish_id)` trên `interactions` | [BR-040](what-we-gonna-eat-today_business-rules_v1.4.md) | **Database** |
| `PRIMARY KEY(final_meal_id, group_dish_id)` (Một món xuất hiện 1 lần trong thực đơn) | [BR-050](what-we-gonna-eat-today_business-rules_v1.4.md) | **Database** |
| `UNIQUE(group_id, global_dish_id)` trên `group_dishes` | [BR-005](what-we-gonna-eat-today_business-rules_v1.4.md) | **Database** |
| `UNIQUE(session_id)` trên `final_meals` (Tối đa 1 Final Meal cho mỗi Session) | [BR-025](what-we-gonna-eat-today_business-rules_v1.4.md) | **Database** |
| Participant bắt buộc phải là Group Member | [BR-026](what-we-gonna-eat-today_business-rules_v1.4.md) | **Application** |
| Mọi Dish trong Final Meal phải Active tại thời điểm finalize | [BR-050](what-we-gonna-eat-today_business-rules_v1.4.md) | **Application** |

## 3.2 Các quyết định đồng bộ Schema

1. **Đổi tên `sessions` $\to$ `selection_sessions`:** Tránh xung đột với bảng session của Auth.js / NextAuth.
2. **Loại bỏ `group_id` và `decision_date` khỏi `final_meals`:** Cả hai trường đều suy ra được qua `session_id`, loại bỏ dữ liệu dư thừa.
3. **Loại bỏ `invalid_reason` ở v1.0:** Trạng thái `INVALID` chỉ kích hoạt từ v1.1+ (F26 Timeout, F41 Cancel).

---

# 4. Lưu đồ vòng đời phiên chọn món (Session Lifecycle Flowchart)

> **Mục đích:** Mô tả đầy đủ các trạng thái và điểm rẽ nhánh xử lý lỗi trong vòng đời một phiên chọn món.

```mermaid
flowchart TD
    start([🧑‍🍳 Creator mở phiên]) --> chk1{"Đã có Session<br/>ACTIVE hoặc FINALIZED<br/>hôm nay?"}
    chk1 -->|Có| e1["⚠️ ERR_SESSION_EXISTS_TODAY<br/>(Điều hướng tới phiên đang chạy)"]
    chk1 -->|Không| draft["📝 DRAFT<br/>(Creator là Participant mặc định)"]

    draft --> addp["Thêm Participant<br/>(SPEC-009)"]
    addp --> draft
    draft --> startbtn["Creator bấm Bắt đầu (Start)"]

    startbtn --> v1{"Creator còn là<br/>Group Member?"}
    v1 -->|Không| e2["❌ ERR_NOT_GROUP_MEMBER<br/>(Giữ nguyên DRAFT)"]
    v1 -->|Có| v2{"Mọi Participant<br/>còn là Member?"}
    v2 -->|Không| e3["❌ ERR_PARTICIPANT_NOT_MEMBER<br/>(Nêu rõ tên · Giữ DRAFT)"]
    v2 -->|Có| v3{"Ràng buộc duy nhất<br/>còn hợp lệ?"}
    v3 -->|Không| e1
    v3 -->|Có| snap["Snapshot Session Rules<br/>(SPEC-022)"]

    snap --> active["🚀 ACTIVE<br/>(Thành viên bắt đầu vuốt thẻ)"]

    active --> swipe["Vuốt thẻ, Undo, Báo xong<br/>(SPEC-012, SPEC-013)"]
    swipe --> active
    active --> compose["Creator chọn món nháp<br/>(SPEC-015)"]
    compose --> active

    active --> fin["Creator bấm Chốt bữa (Finalize)"]
    fin --> f1{"Thực đơn có món?"}
    f1 -->|Không| e4["❌ ERR_EMPTY_FINAL_MEAL<br/>(Giữ nguyên ACTIVE)"]
    f1 -->|Có| f2{"Mọi Dish còn Active<br/>trong nhóm?"}
    f2 -->|Không| e5["❌ ERR_DISH_NOT_IN_POOL<br/>(Giữ nguyên ACTIVE)"]
    f2 -->|Có| f3{"Required Rules<br/>đều thỏa mãn?"}
    f3 -->|Không| e6["❌ ERR_REQUIRED_RULE_FAILED<br/>(Nêu rõ quy tắc thiếu · Giữ ACTIVE)"]
    f3 -->|Có| done["✅ FINALIZED<br/>(Sinh Eating History trong cùng Transaction)"]

    done --> stop([🏁 Đóng phiên — Không Reopen])

    e2 --> draft
    e3 --> draft
    e4 --> active
    e5 --> active
    e6 --> active

    invalid["🛑 INVALID<br/>(Hết hạn / Hủy phiên ở v1.2)"]
    active -.->|"Timeout cuối ngày (F26)"| invalid

    style invalid stroke-dasharray: 5 5
    style e1 fill:#FBE9E7,stroke:#A3261C
    style e2 fill:#FBE9E7,stroke:#A3261C
    style e3 fill:#FBE9E7,stroke:#A3261C
    style e4 fill:#FBE9E7,stroke:#A3261C
    style e5 fill:#FBE9E7,stroke:#A3261C
    style e6 fill:#FBE9E7,stroke:#A3261C
```

> [!NOTE]
> Mọi nhánh lỗi nghiệp vụ đều **quay trở về trạng thái cũ an toàn** (`DRAFT` hoặc `ACTIVE`). Không có trạng thái trung gian bị treo hay dữ liệu rác.

---

# 5. Sơ đồ tuần tự chốt bữa ăn (Finalize Sequence Diagram)

> **Mục đích:** Minh họa ranh giới Clean Architecture và giao dịch nguyên tử (Atomic Transaction) khi thực thi Finalize Meal.

```mermaid
sequenceDiagram
    autonumber
    actor C as 🧑‍🍳 Creator
    participant UI as React Client (Mobile)
    participant SA as Server Action (Presentation)
    participant UC as FinalizeMeal UseCase (Application)
    participant DOM as RuleEvaluator (Domain)
    participant REPO as MealRepository (Infrastructure)
    participant DB as Neon Postgres

    C->>UI: Bấm "Chốt bữa ăn hôm nay"
    UI->>SA: finalizeMealAction(sessionId)
    SA->>UC: execute(sessionId, userId)

    UC->>REPO: loadSession(sessionId)
    REPO->>DB: SELECT * FROM selection_sessions WHERE id = ?
    DB-->>REPO: session record
    REPO-->>UC: Session entity

    alt Trạng thái khác ACTIVE
        UC-->>SA: Failure(ERR_SESSION_NOT_ACTIVE)
        SA-->>UI: Hiển thị lỗi phiên không còn mở
    end

    alt Người gọi không phải Creator
        UC-->>SA: Failure(ERR_NOT_SESSION_CREATOR)
        SA-->>UI: Hiển thị lỗi không có quyền
    end

    UC->>REPO: loadDraftItems(sessionId)
    REPO->>DB: SELECT * FROM final_meal_items WHERE session_id = ?
    DB-->>REPO: dishIds nháp
    REPO-->>UC: dishIds

    alt Danh sách món rỗng
        UC-->>SA: Failure(ERR_EMPTY_FINAL_MEAL)
        SA-->>UI: Yêu cầu chọn ít nhất 1 món
    end

    UC->>REPO: loadActiveDishesWithTags(groupId, dishIds)
    Note over REPO,DB: System Tag lấy giá trị hiện tại theo BR-052
    REPO->>DB: SELECT group_dishes + group_dish_tags
    DB-->>REPO: dish entities
    REPO-->>UC: dish entities

    alt Có món bị Inactive giữa chừng
        UC-->>SA: Failure(ERR_DISH_NOT_IN_POOL)
        SA-->>UI: Thông báo món không còn khả dụng
    end

    UC->>REPO: loadSessionRules(sessionId)
    REPO->>DB: SELECT * FROM session_rules WHERE session_id = ?
    DB-->>REPO: session rules snapshot
    REPO-->>UC: rules

    UC->>DOM: evaluateRequired(dishes, rules)
    Note over DOM: Hàm thuần túy · Đếm Tag độc lập<br/>(1 món thỏa nhiều tag cùng lúc)
    DOM-->>UC: Pass hoặc danh sách rule còn thiếu

    alt Chưa đạt Required Rules
        UC-->>SA: Failure(ERR_REQUIRED_RULE_FAILED, missingRules)
        SA-->>UI: Cảnh báo: "Còn thiếu 1 món Canh"
        Note over UI: Session vẫn giữ trạng thái ACTIVE
    end

    UC->>REPO: commitFinalizeTransaction(session, dishes, participants)
    REPO->>DB: BEGIN TRANSACTION
    REPO->>DB: INSERT INTO final_meals (...)
    REPO->>DB: INSERT INTO final_meal_items (...)
    REPO->>DB: INSERT INTO eating_history (user_id, dish_id, eating_date)
    REPO->>DB: UPDATE selection_sessions SET state = 'FINALIZED'
    REPO->>DB: COMMIT
    DB-->>REPO: Success
    REPO-->>UC: FinalMeal entity

    UC-->>SA: Success(FinalMeal)
    SA-->>UI: Điều hướng sang màn hình S-11 (Bữa ăn hôm nay)
    UI-->>C: Hiển thị mâm cơm chốt thành công 🎉
```

---

# 6. Lịch sử thay đổi (Change History)

| Version | Ngày | Phần tác động | Nội dung thay đổi | Cơ sở / Quyết định |
| :---: | :---: | :--- | :--- | :--- |
| `0.1` | 2026-08-14 | Toàn bộ | Bản thảo đầu tiên: C4 Context/Container, ERD 15 bảng, Flowchart và Sequence | Khởi tạo baseline thiết kế hệ thống |
