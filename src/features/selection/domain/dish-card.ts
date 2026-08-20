import type { InteractionType } from './interaction'

export type DishCard = {
  readonly dishId: string
  readonly globalDishId: string
  readonly name: string
  /** Luôn rỗng ở S5 — `group_dish_tags` là E2-T5, chưa tồn tại. */
  readonly systemTags: readonly string[]
  readonly effectiveInteraction: InteractionType | null
}
