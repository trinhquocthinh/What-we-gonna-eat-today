CREATE TYPE "public"."participant_state" AS ENUM('ACTIVE', 'COMPLETED', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."session_state" AS ENUM('DRAFT', 'ACTIVE', 'FINALIZED', 'INVALID');--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"state" "participant_state" DEFAULT 'ACTIVE' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selection_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"decision_date" date NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"state" "session_state" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finalized_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_session_id_selection_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."selection_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selection_sessions" ADD CONSTRAINT "selection_sessions_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selection_sessions" ADD CONSTRAINT "selection_sessions_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "participants_session_user_unique" ON "participants" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX "selection_sessions_group_date_idx" ON "selection_sessions" USING btree ("group_id","decision_date");--> statement-breakpoint
CREATE UNIQUE INDEX "selection_sessions_active_per_group_date" ON "selection_sessions" USING btree ("group_id","decision_date") WHERE "selection_sessions"."state" in ('ACTIVE', 'FINALIZED');