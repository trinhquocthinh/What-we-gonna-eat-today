export type InteractionType = 'SWIPE_RIGHT' | 'SWIPE_LEFT'

/** Ba giá trị người dùng gửi lên được qua SPEC-012. */
export type InteractionAction = 'SWIPE_RIGHT' | 'SWIPE_LEFT' | 'UNDO'

/**
 * Những gì có thể xuất hiện trong `interaction_events.action`. RỘNG HƠN
 * `InteractionAction`: `CANNOT_EAT` do hệ thống ghi khi BR-034 xoá một lượt
 * vuốt, KHÔNG phải một hành động client gửi lên được.
 */
export type InteractionEventAction = InteractionAction | 'CANNOT_EAT'
