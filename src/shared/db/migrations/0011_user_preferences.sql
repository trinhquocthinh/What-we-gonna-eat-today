CREATE TYPE "public"."preference_kind" AS ENUM('LIKE', 'DISLIKE');--> statement-breakpoint
CREATE TABLE "user_dish_constraints" (
	"user_id" uuid NOT NULL,
	"global_dish_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_dish_constraints_user_id_global_dish_id_pk" PRIMARY KEY("user_id","global_dish_id")
);
--> statement-breakpoint
CREATE TABLE "user_dish_preferences" (
	"user_id" uuid NOT NULL,
	"global_dish_id" uuid NOT NULL,
	"kind" "preference_kind" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_dish_preferences_user_id_global_dish_id_pk" PRIMARY KEY("user_id","global_dish_id")
);
--> statement-breakpoint
ALTER TABLE "user_dish_constraints" ADD CONSTRAINT "user_dish_constraints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_dish_constraints" ADD CONSTRAINT "user_dish_constraints_global_dish_id_global_dishes_id_fk" FOREIGN KEY ("global_dish_id") REFERENCES "public"."global_dishes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_dish_preferences" ADD CONSTRAINT "user_dish_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_dish_preferences" ADD CONSTRAINT "user_dish_preferences_global_dish_id_global_dishes_id_fk" FOREIGN KEY ("global_dish_id") REFERENCES "public"."global_dishes"("id") ON DELETE no action ON UPDATE no action;