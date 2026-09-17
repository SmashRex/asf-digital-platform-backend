CREATE TABLE "fs_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"admission_id" uuid NOT NULL,
	"last_opened_chapter_id" varchar(100),
	"status" varchar(20) DEFAULT 'Active' NOT NULL,
	"completion_recorded_by" uuid,
	"completion_recorded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_fs_student_status" CHECK ("fs_students"."status" IN ('Active', 'Withdrawn', 'Graduated', 'Not Completed'))
);
--> statement-breakpoint
ALTER TABLE "fs_students" ADD CONSTRAINT "fs_students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fs_students" ADD CONSTRAINT "fs_students_class_id_fs_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."fs_classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fs_students" ADD CONSTRAINT "fs_students_admission_id_fs_admissions_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."fs_admissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fs_students" ADD CONSTRAINT "fs_students_completion_recorded_by_users_id_fk" FOREIGN KEY ("completion_recorded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unq_fs_student_active_per_user" ON "fs_students" USING btree ("user_id") WHERE "fs_students"."status" = 'Active';--> statement-breakpoint
CREATE INDEX "idx_fs_students_user" ON "fs_students" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_fs_students_class" ON "fs_students" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_fs_students_status" ON "fs_students" USING btree ("status");