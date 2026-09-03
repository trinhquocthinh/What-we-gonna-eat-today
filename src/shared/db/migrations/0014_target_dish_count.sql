ALTER TABLE "groups" ADD COLUMN "target_dish_count" integer;--> statement-breakpoint
ALTER TABLE "selection_sessions" ADD COLUMN "target_dish_count" integer;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_target_dish_count_positive" CHECK ("groups"."target_dish_count" >= 1);
