CREATE TYPE "public"."group_dish_state" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TABLE "global_dishes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_from_group_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_dishes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"global_dish_id" uuid NOT NULL,
	"state" "group_dish_state" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "global_dishes" ADD CONSTRAINT "global_dishes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_dishes" ADD CONSTRAINT "global_dishes_created_from_group_id_groups_id_fk" FOREIGN KEY ("created_from_group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_dishes" ADD CONSTRAINT "group_dishes_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_dishes" ADD CONSTRAINT "group_dishes_global_dish_id_global_dishes_id_fk" FOREIGN KEY ("global_dish_id") REFERENCES "public"."global_dishes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "global_dishes_normalized_name_idx" ON "global_dishes" USING btree ("normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "group_dishes_group_global_unique" ON "group_dishes" USING btree ("group_id","global_dish_id");--> statement-breakpoint
CREATE INDEX "group_dishes_group_state_idx" ON "group_dishes" USING btree ("group_id","state");