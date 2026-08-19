CREATE TYPE "public"."system_tag" AS ENUM('STAPLE', 'MAIN', 'SIDE', 'SOUP', 'DESSERT');--> statement-breakpoint
CREATE TABLE "group_dish_tags" (
	"group_dish_id" uuid NOT NULL,
	"system_tag" "system_tag" NOT NULL,
	CONSTRAINT "group_dish_tags_group_dish_id_system_tag_pk" PRIMARY KEY("group_dish_id","system_tag")
);
--> statement-breakpoint
ALTER TABLE "group_dish_tags" ADD CONSTRAINT "group_dish_tags_group_dish_id_group_dishes_id_fk" FOREIGN KEY ("group_dish_id") REFERENCES "public"."group_dishes"("id") ON DELETE no action ON UPDATE no action;