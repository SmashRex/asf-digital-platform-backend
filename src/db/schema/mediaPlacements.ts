import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { mediaAssets } from "./mediaAssets.js";

export const mediaPlacements = pgTable(
  "media_placements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 160 }).notNull().unique(),
    label: varchar("label", { length: 255 }).notNull(),
    description: text("description"),
    currentAssetId: uuid("current_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    assignedBy: uuid("assigned_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_media_placements_current_asset").on(table.currentAssetId)]
);
