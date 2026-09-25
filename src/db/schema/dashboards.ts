import { pgTable, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const dashboards = pgTable("dashboards", {
  id: varchar("id", { length: 60 }).primaryKey(), // 'president', 'vice-president', 'publicity'
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});