import { pgTable, uuid, varchar, text, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    priority: varchar("priority", { length: 20 }).notNull().default("Normal"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    publicationStatus: varchar("publication_status", { length: 20 }).notNull().default("draft"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_announcements_created_at").on(table.createdAt),
    index("idx_announcements_status").on(table.publicationStatus),
    check("chk_announcements_priority", sql`${table.priority} IN ('Normal', 'Urgent')`),
    check("chk_announcements_publication_status", sql`${table.publicationStatus} IN ('draft', 'published')`),
  ]
);