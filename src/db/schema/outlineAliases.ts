import { pgTable, uuid, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const outlineSectionAliases = pgTable(
  "outline_section_aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canonicalKey: varchar("canonical_key", { length: 50 }).notNull(),
    alias: varchar("alias", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("unq_canonical_alias").on(table.canonicalKey, table.alias)]
);