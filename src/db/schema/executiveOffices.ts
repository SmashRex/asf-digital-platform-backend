import { pgTable, varchar, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const executiveOffices = pgTable("executive_offices", {
  id: varchar("id", { length: 60 }).primaryKey(), // e.g. 'president', 'vice-president', 'sisters-coordinator'
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});