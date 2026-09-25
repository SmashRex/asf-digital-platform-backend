import { pgTable, uuid, varchar, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { executiveOffices } from "./executiveOffices.js";

export const userExecutiveOffices = pgTable(
  "user_executive_offices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    officeId: varchar("office_id", { length: 60 })
      .notNull()
      .references(() => executiveOffices.id, { onDelete: "restrict" }),
    assignedBy: uuid("assigned_by").references(() => users.id, { onDelete: "set null" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("unq_user_executive_office").on(table.userId, table.officeId),
    index("idx_user_exec_offices_user").on(table.userId),
    index("idx_user_exec_offices_office").on(table.officeId),
  ]
);