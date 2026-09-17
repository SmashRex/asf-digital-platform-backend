CREATE TABLE "fs_class_teachers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fs_class_teachers" ADD CONSTRAINT "fs_class_teachers_class_id_fs_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."fs_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fs_class_teachers" ADD CONSTRAINT "fs_class_teachers_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unq_fs_class_teacher" ON "fs_class_teachers" USING btree ("class_id","teacher_id");--> statement-breakpoint
CREATE INDEX "idx_fs_class_teachers_class" ON "fs_class_teachers" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_fs_class_teachers_teacher" ON "fs_class_teachers" USING btree ("teacher_id");