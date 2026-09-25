import { pgTable, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const capabilities = pgTable("capabilities", {
  id: varchar("id", { length: 60 }).primaryKey(), // 'technical_head'
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});