CREATE TYPE "public"."interaction_action" AS ENUM('SWIPE_RIGHT', 'SWIPE_LEFT', 'UNDO');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('SWIPE_RIGHT', 'SWIPE_LEFT');--> statement-breakpoint
CREATE TABLE "interaction_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"group_dish_id" uuid NOT NULL,
	"action" "interaction_action" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"group_dish_id" uuid NOT NULL,
	"type" "interaction_type" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interaction_events" ADD CONSTRAINT "interaction_events_session_id_selection_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."selection_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction_events" ADD CONSTRAINT "interaction_events_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction_events" ADD CONSTRAINT "interaction_events_group_dish_id_group_dishes_id_fk" FOREIGN KEY ("group_dish_id") REFERENCES "public"."group_dishes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_session_id_selection_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."selection_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_group_dish_id_group_dishes_id_fk" FOREIGN KEY ("group_dish_id") REFERENCES "public"."group_dishes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "interactions_session_participant_dish_unique" ON "interactions" USING btree ("session_id","participant_id","group_dish_id");--> statement-breakpoint
CREATE INDEX "interactions_session_id_idx" ON "interactions" USING btree ("session_id");