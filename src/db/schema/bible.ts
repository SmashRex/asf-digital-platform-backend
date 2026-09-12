import { pgTable, varchar, boolean, integer, uuid, text, check, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});


export const bibleBooks = pgTable(
  "bible_books",
  {
    id: varchar("id", { length: 50 }).primaryKey(), // 'genesis', 'matthew'
    name: varchar("name", { length: 100 }).notNull(),
    testament: varchar("testament", { length: 20 }).notNull(),
    bookOrder: integer("book_order").notNull(),
    chapterCount: integer("chapter_count").notNull(),
  },
  (table) => [
    check("chk_testament", sql`${table.testament} IN ('Old', 'New')`),
    check("chk_book_order", sql`${table.bookOrder} > 0`),
    check("chk_chapter_count", sql`${table.chapterCount} > 0`),
  ]
);

export const bibleVerses = pgTable(
  "bible_verses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    translationId: varchar("translation_id", { length: 20 })
      .notNull()
      .references(() => bibleTranslations.id, { onDelete: "restrict" }),
    bookId: varchar("book_id", { length: 50 })
      .notNull()
      .references(() => bibleBooks.id, { onDelete: "restrict" }),
    chapter: integer("chapter").notNull(),
    verse: integer("verse").notNull(),
    text: text("text").notNull(),
    tsv: tsvector("tsv").generatedAlwaysAs(sql`to_tsvector('english', ${sql.raw("text")})`),
  },
  (table) => [
    uniqueIndex("unq_translation_book_chap_verse").on(table.translationId, table.bookId, table.chapter, table.verse),
    check("chk_verse_chapter_pos", sql`${table.chapter} > 0 AND ${table.verse} > 0`),
    index("idx_bible_lookup").on(table.translationId, table.bookId, table.chapter),
    index("idx_bible_verses_tsv").using("gin", table.tsv),
  ]
);

export const bibleTranslations = pgTable(
  "bible_translations",
  {
    id: varchar("id", { length: 20 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    language: varchar("language", { length: 50 }).notNull().default("English"),
    isActive: boolean("is_active").notNull().default(true),
    sourceType: varchar("source_type", { length: 20 }).notNull().default("local"),
    externalId: varchar("external_id", { length: 100 }),
  },
  (table) => [check("chk_source_type", sql`${table.sourceType} IN ('local', 'external')`)]
);