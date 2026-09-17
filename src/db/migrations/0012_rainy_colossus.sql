CREATE TABLE "fs_admissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"testimony" text,
	"status" varchar(20) DEFAULT 'Pending' NOT NULL,
	"assigned_class_id" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_fs_admission_status" CHECK ("fs_admissions"."status" IN ('Pending', 'Approved', 'Rejected'))
);
--> statement-breakpoint
ALTER TABLE "fs_admissions" ADD CONSTRAINT "fs_admissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fs_admissions" ADD CONSTRAINT "fs_admissions_assigned_class_id_fs_classes_id_fk" FOREIGN KEY ("assigned_class_id") REFERENCES "public"."fs_classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fs_admissions" ADD CONSTRAINT "fs_admissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unq_fs_admission_pending_per_user" ON "fs_admissions" USING btree ("user_id") WHERE "fs_admissions"."status" = 'Pending';--> statement-breakpoint
CREATE INDEX "idx_fs_admissions_status" ON "fs_admissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_fs_admissions_user" ON "fs_admissions" USING btree ("user_id");