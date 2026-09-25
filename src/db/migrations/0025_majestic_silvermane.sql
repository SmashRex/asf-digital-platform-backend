CREATE TABLE "bible_study_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"theme" varchar(255),
	"start_date" date NOT NULL,
	"status" varchar(50) DEFAULT 'Draft' NOT NULL,
	"academic_session_id" varchar(20),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_series_status" CHECK ("bible_study_series"."status" IN ('Draft', 'Active', 'Completed'))
);
--> statement-breakpoint
ALTER TABLE "bible_studies" ADD COLUMN "series_id" uuid;--> statement-breakpoint
ALTER TABLE "bible_studies" ADD COLUMN "scheduled_date" date;--> statement-breakpoint
ALTER TABLE "bible_study_series" ADD CONSTRAINT "bible_study_series_academic_session_id_academic_sessions_id_fk" FOREIGN KEY ("academic_session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bible_study_series" ADD CONSTRAINT "bible_study_series_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_series_start_date" ON "bible_study_series" USING btree ("start_date");--> statement-breakpoint
ALTER TABLE "bible_studies" ADD CONSTRAINT "bible_studies_series_id_bible_study_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."bible_study_series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bible_studies_scheduled_date" ON "bible_studies" USING btree ("scheduled_date");