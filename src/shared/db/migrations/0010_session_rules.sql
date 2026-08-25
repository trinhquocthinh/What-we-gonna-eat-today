CREATE TABLE "session_rules" (
	"session_id" uuid NOT NULL,
	"rule_type" "group_rule_type" NOT NULL,
	"system_tag" "system_tag" NOT NULL,
	"minimum_count" integer NOT NULL,
	CONSTRAINT "session_rules_session_id_rule_type_system_tag_pk" PRIMARY KEY("session_id","rule_type","system_tag"),
	CONSTRAINT "session_rules_minimum_count_positive" CHECK ("session_rules"."minimum_count" >= 1)
);
--> statement-breakpoint
ALTER TABLE "session_rules" ADD CONSTRAINT "session_rules_session_id_selection_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."selection_sessions"("id") ON DELETE no action ON UPDATE no action;