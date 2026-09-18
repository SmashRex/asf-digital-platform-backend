ALTER TABLE "events" ADD COLUMN "category" varchar(50) DEFAULT 'Fellowship' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "speaker" varchar(255);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "speaker_role" varchar(255);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "mode" varchar(20) DEFAULT 'In-Person' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "theme" varchar(255);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "chk_events_mode" CHECK ("events"."mode" IN ('In-Person', 'Online / Zoom', 'Hybrid'));--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "chk_events_category" CHECK ("events"."category" IN ('Bible Study', 'Prayer', 'Worship', 'Outreach', 'Fellowship', 'Special Program', 'Administrative'));