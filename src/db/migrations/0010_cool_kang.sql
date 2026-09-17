CREATE TABLE "fs_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"academic_session_id" varchar(20) NOT NULL,
	"semester" varchar(20) NOT NULL,
	"teacher_cap" integer,
	"manual_visible" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'Active' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_fs_class_semester" CHECK ("fs_classes"."semester" IN ('First', 'Second')),
	CONSTRAINT "chk_fs_class_status" CHECK ("fs_classes"."status" IN ('Active', 'Archived')),
	CONSTRAINT "chk_fs_class_teacher_cap" CHECK ("fs_classes"."teacher_cap" IS NULL OR "fs_classes"."teacher_cap" > 0)
);
--> statement-breakpoint
ALTER TABLE "fs_classes" ADD CONSTRAINT "fs_classes_academic_session_id_academic_sessions_id_fk" FOREIGN KEY ("academic_session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fs_classes" ADD CONSTRAINT "fs_classes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fs_classes_session" ON "fs_classes" USING btree ("academic_session_id");--> statement-breakpoint
CREATE INDEX "idx_fs_classes_status" ON "fs_classes" USING btree ("status");