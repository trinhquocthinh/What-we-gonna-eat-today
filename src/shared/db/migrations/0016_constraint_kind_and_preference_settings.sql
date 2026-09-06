-- E13-T1 — SPEC-038/039/040. Viết tay, KHÔNG dùng nguyên bản `drizzle-kit generate`:
-- bản sinh tự động đặt `ADD CONSTRAINT … PRIMARY KEY(…,"kind")` TRƯỚC `ADD COLUMN "kind"`
-- (câu đó đổ), và kéo theo cả nội dung 0014/0015 vì chuỗi snapshot trong `meta/`
-- đứt từ 0013.
--
-- ROLLBACK — chạy đúng thứ tự này, bước DELETE KHÔNG được bỏ:
--
--   DELETE FROM "user_dish_constraints" WHERE "kind" <> 'CANNOT_EAT';
--   ALTER TABLE "user_dish_constraints" DROP CONSTRAINT "user_dish_constraints_user_id_global_dish_id_kind_pk";
--   ALTER TABLE "user_dish_constraints" ADD CONSTRAINT "user_dish_constraints_user_id_global_dish_id_pk" PRIMARY KEY("user_id","global_dish_id");
--   ALTER TABLE "user_dish_constraints" DROP COLUMN "kind";
--   DROP TABLE "user_preference_settings";
--   DROP INDEX "participants_user_id_idx";
--   DROP INDEX "interactions_participant_id_idx";
--   DROP TYPE "public"."constraint_kind";
--
-- Bỏ bước DELETE thì việc khôi phục khoá chính cũ ĐỔ: một người vừa khai
-- `Cannot Eat` vừa Blacklist cùng một món có hai dòng cùng
-- (user_id, global_dish_id), và khoá hai cột không nhận. Rollback đổ giữa chừng
-- nguy hiểm hơn hẳn không rollback được — bảng ở lại trạng thái không schema
-- nào mô tả.

CREATE TYPE "public"."constraint_kind" AS ENUM('CANNOT_EAT', 'BLACKLIST', 'HISTORY_WHITELIST');--> statement-breakpoint
-- `DEFAULT 'CANNOT_EAT'` CHÍNH LÀ phép backfill: một câu điền sẵn cho mọi dòng cũ.
ALTER TABLE "user_dish_constraints" ADD COLUMN "kind" "constraint_kind" DEFAULT 'CANNOT_EAT' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_dish_constraints" DROP CONSTRAINT "user_dish_constraints_user_id_global_dish_id_pk";--> statement-breakpoint
ALTER TABLE "user_dish_constraints" ADD CONSTRAINT "user_dish_constraints_user_id_global_dish_id_kind_pk" PRIMARY KEY("user_id","global_dish_id","kind");--> statement-breakpoint
CREATE TABLE "user_preference_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"implicit_reset_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preference_settings" ADD CONSTRAINT "user_preference_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- SPEC-037 — đường đi NGƯỢC với mọi đường truy cập hiện có (`findImplicitSwipes`).
-- Thêm ngay ở T1, không đợi tới lúc `TC-174` đỏ mới thêm.
CREATE INDEX "participants_user_id_idx" ON "participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interactions_participant_id_idx" ON "interactions" USING btree ("participant_id");
