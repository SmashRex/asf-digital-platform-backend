import { pgTable, uuid, varchar, timestamp, uniqueIndex, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { fsClasses } from "./fsClasses.js";
import { fsAdmissions } from "./fsAdmissions.js";

export const fsStudents = pgTable(
  "fs_students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => fsClasses.id, { onDelete: "restrict" }),
    admissionId: uuid("admission_id")
      .notNull()
      .references(() => fsAdmissions.id, { onDelete: "restrict" }),
    lastOpenedChapterId: varchar("last_opened_chapter_id", { length: 100 }),
    status: varchar("status", { length: 20 }).notNull().default("Active"),
    completionRecordedBy: uuid("completion_recorded_by").references(() => users.id, { onDelete: "restrict" }),
    completionRecordedAt: timestamp("completion_recorded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("unq_fs_student_active_per_user")
      .on(table.userId)
      .where(sql`${table.status} = 'Active'`),
    index("idx_fs_students_user").on(table.userId),
    index("idx_fs_students_class").on(table.classId),
    index("idx_fs_students_status").on(table.status),
    check("chk_fs_student_status", sql`${table.status} IN ('Active', 'Withdrawn', 'Graduated', 'Not Completed')`),
  ]
);