CREATE TABLE "eating_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"global_dish_id" uuid NOT NULL,
	"eating_date" date NOT NULL,
	"source_final_meal_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "final_meal_items" (
	"final_meal_id" uuid NOT NULL,
	"group_dish_id" uuid NOT NULL,
	CONSTRAINT "final_meal_items_final_meal_id_group_dish_id_pk" PRIMARY KEY("final_meal_id","group_dish_id")
);
--> statement-breakpoint
CREATE TABLE "final_meals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eating_history" ADD CONSTRAINT "eating_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eating_history" ADD CONSTRAINT "eating_history_global_dish_id_global_dishes_id_fk" FOREIGN KEY ("global_dish_id") REFERENCES "public"."global_dishes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eating_history" ADD CONSTRAINT "eating_history_source_final_meal_id_final_meals_id_fk" FOREIGN KEY ("source_final_meal_id") REFERENCES "public"."final_meals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_meal_items" ADD CONSTRAINT "final_meal_items_final_meal_id_final_meals_id_fk" FOREIGN KEY ("final_meal_id") REFERENCES "public"."final_meals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_meal_items" ADD CONSTRAINT "final_meal_items_group_dish_id_group_dishes_id_fk" FOREIGN KEY ("group_dish_id") REFERENCES "public"."group_dishes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_meals" ADD CONSTRAINT "final_meals_session_id_selection_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."selection_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "eating_history_user_dish_date_source_unique" ON "eating_history" USING btree ("user_id","global_dish_id","eating_date","source_final_meal_id");--> statement-breakpoint
CREATE INDEX "eating_history_user_dish_date_idx" ON "eating_history" USING btree ("user_id","global_dish_id","eating_date" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "final_meals_session_id_unique" ON "final_meals" USING btree ("session_id");