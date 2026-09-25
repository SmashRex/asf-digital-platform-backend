import { pgTable, uuid, varchar, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { dashboards } from "./dashboards.js";

export const userDashboardAccess = pgTable(
  "user_dashboard_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    dashboardId: varchar("dashboard_id", { length: 60 })
      .notNull()
      .references(() => dashboards.id, { onDelete: "restrict" }),
    grantedBy: uuid("granted_by").references(() => users.id, { onDelete: "set null" }),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("unq_user_dashboard").on(table.userId, table.dashboardId),
    index("idx_user_dashboard_user").on(table.userId),
    index("idx_user_dashboard_dashboard").on(table.dashboardId),
  ]
);