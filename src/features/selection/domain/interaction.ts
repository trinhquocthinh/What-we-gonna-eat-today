/**
 * SDD §2.2. `InteractionType` KHÔNG có giá trị `NONE` — "None" được biểu diễn
 * bằng việc KHÔNG tồn tại row trong `interactions` (nguyên văn SDD, không
 * phải suy diễn).
 *
 * `InteractionAction` là tên TỰ ĐẶT: SDD không đặt tên riêng cho enum ba giá
 * trị của cột `interaction_events.action`, chỉ liệt kê chúng trong đầu vào
 * SPEC-012 (`action: SWIPE_RIGHT | SWIPE_LEFT | UNDO`).
 */
export type InteractionType = 'SWIPE_RIGHT' | 'SWIPE_LEFT'
export type InteractionAction = 'SWIPE_RIGHT' | 'SWIPE_LEFT' | 'UNDO'
