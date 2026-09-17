import { pgTable, uuid, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { fsClasses } from "./fsClasses.js";
import { users } from "./users.js";

export const fsClassTeachers = pgTable(
  "fs_class_teachers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => fsClasses.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("unq_fs_class_teacher").on(table.classId, table.teacherId),
    index("idx_fs_class_teachers_class").on(table.classId),
    index("idx_fs_class_teachers_teacher").on(table.teacherId),
  ]
);