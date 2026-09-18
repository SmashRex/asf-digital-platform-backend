ALTER TABLE "announcements" DROP CONSTRAINT "chk_announcements_publication_status";--> statement-breakpoint
DROP INDEX "idx_announcements_status";--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "is_urgent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "status" varchar(30) DEFAULT 'Draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "revision_notes" text;--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "published_by" uuid;--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_announcements_status" ON "announcements" USING btree ("status");--> statement-breakpoint
ALTER TABLE "announcements" DROP COLUMN "publication_status";--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "chk_announcements_status" CHECK ("announcements"."status" IN ('Draft', 'Pending Review', 'Revision Requested', 'Approved', 'Published', 'Archived'));