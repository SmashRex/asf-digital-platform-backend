CREATE TABLE "bible_studies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"topic" varchar(255) NOT NULL,
	"theme" varchar(255) NOT NULL,
	"study_date" date NOT NULL,
	"text_ref" varchar(255) NOT NULL,
	"text_content" text,
	"memory_verse_ref" varchar(100) NOT NULL,
	"memory_verse_text" text NOT NULL,
	"aim" text NOT NULL,
	"introduction" text NOT NULL,
	"study_guide" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"discussion_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"conclusion" text NOT NULL,
	"prayer_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"publication_status" varchar(50) DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"published_by" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_bible_study_status" CHECK ("bible_studies"."publication_status" IN ('draft', 'published', 'archived')),
	CONSTRAINT "chk_lesson_number" CHECK ("bible_studies"."lesson_number" > 0)
);
--> statement-breakpoint
ALTER TABLE "bible_studies" ADD CONSTRAINT "bible_studies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bible_studies" ADD CONSTRAINT "bible_studies_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bible_studies_date" ON "bible_studies" USING btree ("study_date" DESC);--> statement-breakpoint
CREATE INDEX "idx_bible_studies_status" ON "bible_studies" USING btree ("publication_status");