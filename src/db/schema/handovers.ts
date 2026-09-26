import { jsonb, pgTable, text, timestamp, uuid, varchar, check, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";

export const handovers = pgTable(
  "handovers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submittedBy: uuid("submitted_by").notNull().references(() => users.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 20 }).notNull().default("Draft"),
    csvContent: text("csv_content"),
    parsedRows: jsonb("parsed_rows").$type<{ memberId: string; officeId: string }[]>().notNull(),
    validationErrors: jsonb("validation_errors").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    check("chk_handovers_status", sql`${table.status} IN ('Draft', 'Validated', 'Approved', 'Published')`),
    index("idx_handovers_status").on(table.status),
  ]
);