CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(50) NOT NULL,
	"public_id" varchar(500) NOT NULL,
	"secure_url" text NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"format" varchar(50) NOT NULL,
	"original_filename" varchar(255),
	"mime_type" varchar(100) NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "media_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(160) NOT NULL,
	"label" varchar(255) NOT NULL,
	"description" text,
	"current_asset_id" uuid,
	"assigned_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_placements_key_unique" UNIQUE("key")
);
--> statement-breakpoint
INSERT INTO "media_placements" ("key", "label", "description") VALUES
	('public.about.community_photo', 'About community photo', 'Community and fellowship photo in the About section'),
	('public.life.student_grid_1', 'Life student grid 1', 'First image in the Life at ASF student grid'),
	('public.life.student_grid_2', 'Life student grid 2', 'Second image in the Life at ASF student grid'),
	('public.life.student_grid_3', 'Life student grid 3', 'Third image in the Life at ASF student grid'),
	('public.life.student_grid_4', 'Life student grid 4', 'Fourth image in the Life at ASF student grid'),
	('public.life.gallery_1', 'Life gallery 1', 'First image in the Life at ASF gallery'),
	('public.life.gallery_2', 'Life gallery 2', 'Second image in the Life at ASF gallery'),
	('public.life.gallery_3', 'Life gallery 3', 'Third image in the Life at ASF gallery'),
	('public.life.gallery_4', 'Life gallery 4', 'Fourth image in the Life at ASF gallery'),
	('public.life.gallery_5', 'Life gallery 5', 'Fifth image in the Life at ASF gallery'),
	('public.life.gallery_6', 'Life gallery 6', 'Sixth image in the Life at ASF gallery');
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_placements" ADD CONSTRAINT "media_placements_current_asset_id_media_assets_id_fk" FOREIGN KEY ("current_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_placements" ADD CONSTRAINT "media_placements_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_media_assets_created_at" ON "media_assets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_media_placements_current_asset" ON "media_placements" USING btree ("current_asset_id");