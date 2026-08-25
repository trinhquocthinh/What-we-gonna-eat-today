CREATE TYPE "public"."group_rule_type" AS ENUM('REQUIRED', 'PREFERRED');--> statement-breakpoint
CREATE TABLE "group_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"system_tag" "system_tag" NOT NULL,
	"minimum_count" integer NOT NULL,
	"rule_type" "group_rule_type" DEFAULT 'REQUIRED' NOT NULL,
	"overridable" boolean DEFAULT true NOT NULL,
	CONSTRAINT "group_rules_minimum_count_positive" CHECK ("group_rules"."minimum_count" >= 1)
);
--> statement-breakpoint
ALTER TABLE "group_rules" ADD CONSTRAINT "group_rules_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_rules_group_type_tag_unique" ON "group_rules" USING btree ("group_id","rule_type","system_tag");