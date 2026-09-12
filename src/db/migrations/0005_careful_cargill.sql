ALTER TABLE "bible_translations" ADD COLUMN "source_type" varchar(20) DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE "bible_translations" ADD COLUMN "external_id" varchar(100);--> statement-breakpoint
ALTER TABLE "bible_translations" ADD CONSTRAINT "chk_source_type" CHECK ("bible_translations"."source_type" IN ('local', 'external'));