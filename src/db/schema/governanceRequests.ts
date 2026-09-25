import { jsonb, pgTable, text, timestamp, uuid, varchar, check, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";

export const governanceRequests = pgTable(
  "governance_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestType: varchar("request_type", { length: 50 }).notNull(),
    requestedBy: uuid("requested_by").notNull().references(() => users.id, { onDelete: "restrict" }),
    payload: jsonb("payload").$type<Record<string, string>>().notNull(),
    status: varchar("status", { length: 20 }).notNull().default("Pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNotes: text("review_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("chk_governance_request_type", sql`${table.requestType} IN ('office_assignment', 'dashboard_grant', 'capability_grant')`),
    check("chk_governance_request_status", sql`${table.status} IN ('Pending', 'Approved', 'Rejected')`),
    index("idx_governance_requests_status").on(table.status),
  ]
);