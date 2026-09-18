CREATE TABLE "website_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"copy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by" uuid,
	"published_by" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_website_config_status" CHECK ("website_configurations"."status" IN ('draft', 'published'))
);
--> statement-breakpoint
CREATE TABLE "website_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" uuid NOT NULL,
	"section_key" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"subtitle" text,
	"description" text,
	"image_url" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_core" boolean DEFAULT false NOT NULL,
	"order" integer NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_section_type" CHECK ("website_sections"."type" IN ('hero','about','schedule','life','visit','cta','text_image','feature_grid','card_grid','quote','callout','event_highlight','announcement_highlight','gallery_preview','scripture_highlight','custom_content'))
);
--> statement-breakpoint
DROP TABLE "website_revisions" CASCADE;--> statement-breakpoint
ALTER TABLE "website_configurations" ADD CONSTRAINT "website_configurations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_configurations" ADD CONSTRAINT "website_configurations_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_sections" ADD CONSTRAINT "website_sections_config_id_website_configurations_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."website_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_sections" ADD CONSTRAINT "website_sections_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;