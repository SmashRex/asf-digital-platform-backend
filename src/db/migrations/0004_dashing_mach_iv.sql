CREATE TABLE "bible_books" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"testament" varchar(20) NOT NULL,
	"book_order" integer NOT NULL,
	"chapter_count" integer NOT NULL,
	CONSTRAINT "chk_testament" CHECK ("bible_books"."testament" IN ('Old', 'New')),
	CONSTRAINT "chk_book_order" CHECK ("bible_books"."book_order" > 0),
	CONSTRAINT "chk_chapter_count" CHECK ("bible_books"."chapter_count" > 0)
);
--> statement-breakpoint
CREATE TABLE "bible_translations" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"language" varchar(50) DEFAULT 'English' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bible_verses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"translation_id" varchar(20) NOT NULL,
	"book_id" varchar(50) NOT NULL,
	"chapter" integer NOT NULL,
	"verse" integer NOT NULL,
	"text" text NOT NULL,
	"tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
	CONSTRAINT "chk_verse_chapter_pos" CHECK ("bible_verses"."chapter" > 0 AND "bible_verses"."verse" > 0)
);
--> statement-breakpoint
ALTER TABLE "bible_verses" ADD CONSTRAINT "bible_verses_translation_id_bible_translations_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."bible_translations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bible_verses" ADD CONSTRAINT "bible_verses_book_id_bible_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."bible_books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unq_translation_book_chap_verse" ON "bible_verses" USING btree ("translation_id","book_id","chapter","verse");--> statement-breakpoint
CREATE INDEX "idx_bible_lookup" ON "bible_verses" USING btree ("translation_id","book_id","chapter");--> statement-breakpoint
CREATE INDEX "idx_bible_verses_tsv" ON "bible_verses" USING gin ("tsv");