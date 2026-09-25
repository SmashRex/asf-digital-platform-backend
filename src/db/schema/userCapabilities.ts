import { pgTable, uuid, varchar, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { capabilities } from "./capabilities.js";

export const userCapabilities = pgTable(
  "user_capabilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    capabilityId: varchar("capability_id", { length: 60 })
      .notNull()
      .references(() => capabilities.id, { onDelete: "restrict" }),
    grantedBy: uuid("granted_by").references(() => users.id, { onDelete: "set null" }),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("unq_user_capability").on(table.userId, table.capabilityId),
    index("idx_user_capabilities_user").on(table.userId),
    index("idx_user_capabilities_capability").on(table.capabilityId),
  ]
);