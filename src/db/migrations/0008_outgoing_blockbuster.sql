CREATE TABLE "bible_book_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" varchar(50) NOT NULL,
	"alias" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bible_book_aliases" ADD CONSTRAINT "bible_book_aliases_book_id_bible_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."bible_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unq_book_alias" ON "bible_book_aliases" USING btree ("alias");