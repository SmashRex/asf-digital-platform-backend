import { pgTable, uuid, varchar, date, timestamp, check, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { academicSessions } from "./academicSessions.js";

export const bibleStudySeries = pgTable(
  "bible_study_series",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).notNull(),
    theme: varchar("theme", { length: 255 }),
    startDate: date("start_date").notNull(),
    status: varchar("status", { length: 50 }).notNull().default("Draft"),
    academicSessionId: varchar("academic_session_id", { length: 20 }).references(() => academicSessions.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("chk_series_status", sql`${table.status} IN ('Draft', 'Active', 'Completed')`),
    index("idx_series_start_date").on(table.startDate),
  ]
);