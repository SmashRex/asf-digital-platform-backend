import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const departments = pgTable("departments", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  school: varchar("school", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});