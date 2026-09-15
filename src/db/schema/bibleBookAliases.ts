import { pgTable, uuid, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { bibleBooks } from "./bible.js";

export const bibleBookAliases = pgTable(
  "bible_book_aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: varchar("book_id", { length: 50 })
      .notNull()
      .references(() => bibleBooks.id, { onDelete: "cascade" }),
    alias: varchar("alias", { length: 50 }).notNull(), // stored normalized: lowercase, no periods
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("unq_book_alias").on(table.alias)]
);