import { pgTable, uuid, text, varchar, timestamp, uniqueIndex, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { fsClasses } from "./fsClasses.js";

export const fsAdmissions = pgTable(
  "fs_admissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    testimony: text("testimony"),
    status: varchar("status", { length: 20 }).notNull().default("Pending"),
    assignedClassId: uuid("assigned_class_id").references(() => fsClasses.id, { onDelete: "restrict" }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "restrict" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNotes: text("review_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("unq_fs_admission_pending_per_user")
      .on(table.userId)
      .where(sql`${table.status} = 'Pending'`),
    index("idx_fs_admissions_status").on(table.status),
    index("idx_fs_admissions_user").on(table.userId),
    check("chk_fs_admission_status", sql`${table.status} IN ('Pending', 'Approved', 'Rejected')`),
  ]
);