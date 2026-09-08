import { pgTable, varchar, text } from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
});