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
