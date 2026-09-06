CREATE TYPE "public"."deck_mode" AS ENUM('FREE', 'COURSE');--> statement-breakpoint
CREATE TABLE "session_courses" (
	"session_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"system_tag" "system_tag" NOT NULL,
	CONSTRAINT "session_courses_session_id_position_pk" PRIMARY KEY("session_id","position")
);
--> statement-breakpoint
ALTER TABLE "selection_sessions" ADD COLUMN "deck_mode" "deck_mode" DEFAULT 'FREE' NOT NULL;--> statement-breakpoint
ALTER TABLE "session_courses" ADD CONSTRAINT "session_courses_session_id_selection_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."selection_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "session_courses_session_tag_unique" ON "session_courses" USING btree ("session_id","system_tag");
