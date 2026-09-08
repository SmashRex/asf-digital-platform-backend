import { pgTable, varchar, date, boolean, timestamp, uniqueIndex, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const academicSessions = pgTable(
  "academic_sessions",
  {
    id: varchar("id", { length: 20 }).primaryKey(), // e.g. '2024/2025'
    name: varchar("name", { length: 100 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("unq_active_academic_session").on(table.isActive).where(sql`${table.isActive} = TRUE`),
    check("chk_session_dates", sql`${table.endDate} >= ${table.startDate}`),
  ]
);