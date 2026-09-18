import { pgTable, uuid, varchar, text, jsonb, integer, boolean, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { websiteConfigurations } from "./websiteConfigurations.js";
import { users } from "./users.js";

export const websiteSections = pgTable(
  "website_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    configId: uuid("config_id")
      .notNull()
      .references(() => websiteConfigurations.id, { onDelete: "cascade" }),
    sectionKey: varchar("section_key", { length: 100 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    subtitle: text("subtitle"),
    description: text("description"),
    imageUrl: text("image_url"),
    items: jsonb("items").notNull().default([]),
    configuration: jsonb("configuration").notNull().default({}),
    isCore: boolean("is_core").notNull().default(false),
    order: integer("order").notNull(),
    isVisible: boolean("is_visible").notNull().default(true),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "chk_section_type",
      sql`${table.type} IN ('hero','about','schedule','life','visit','cta','text_image','feature_grid','card_grid','quote','callout','event_highlight','announcement_highlight','gallery_preview','scripture_highlight','custom_content')`
    ),
  ]
);