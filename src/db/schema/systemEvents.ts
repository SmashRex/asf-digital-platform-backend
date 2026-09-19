import { pgTable, uuid, varchar, text, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const systemEvents = pgTable(
  "system_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    component: varchar("component", { length: 50 }).notNull(),
    severity: varchar("severity", { length: 20 }).notNull().default("Info"),
    event: varchar("event", { length: 255 }).notNull(),
    message: text("message").notNull(),
    details: text("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("chk_system_events_severity", sql`${table.severity} IN ('Info', 'Success', 'Warning', 'Error')`),
  ]
);