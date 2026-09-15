CREATE TABLE "outline_section_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_key" varchar(50) NOT NULL,
	"alias" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unq_canonical_alias" ON "outline_section_aliases" USING btree ("canonical_key","alias");