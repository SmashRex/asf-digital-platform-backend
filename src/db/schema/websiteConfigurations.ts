import { pgTable, uuid, integer, jsonb, varchar, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";

export const websiteConfigurations = pgTable(
  "website_configurations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    version: integer("version").notNull().default(1),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    copy: jsonb("copy").notNull().default({}),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "restrict" }),
    publishedBy: uuid("published_by").references(() => users.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("chk_website_config_status", sql`${table.status} IN ('draft', 'published')`)]
);