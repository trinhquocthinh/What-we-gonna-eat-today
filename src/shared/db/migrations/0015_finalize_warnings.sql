CREATE TYPE "public"."finalize_warning_kind" AS ENUM('PREFERRED_SHORTFALL', 'TARGET_COUNT');--> statement-breakpoint
CREATE TABLE "finalize_warnings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"kind" "finalize_warning_kind" NOT NULL,
	"system_tag" "system_tag",
	"expected" integer NOT NULL,
	"actual" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "finalize_warnings" ADD CONSTRAINT "finalize_warnings_session_id_selection_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."selection_sessions"("id") ON DELETE no action ON UPDATE no action;
