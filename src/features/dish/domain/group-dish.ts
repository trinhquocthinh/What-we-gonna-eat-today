/**
 * SDD §2.2 — `GroupDishState = ACTIVE | INACTIVE` (BR-005).
 *
 * Bản sao của enum `group_dish_state` trong `src/shared/db/schema.ts`. Hai chỗ
 * KHÔNG ràng buộc nhau lúc biên dịch — `domain/` không được import drizzle.
 * Chỗ chúng gặp nhau và `tsc` canh được là
 * `infrastructure/drizzle-dish-repository.ts`. Sửa một bên thì sửa cả hai.
 */
export type GroupDishState = 'ACTIVE' | 'INACTIVE'
