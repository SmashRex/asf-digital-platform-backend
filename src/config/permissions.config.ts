export const permissions = {
  "members.view_directory": [
    "Member", "FS Teacher", "VP / FS Coordinator", "Bible Study Coordinator",
    "Publicity Coordinator", "General Secretary", "President / Executive", "Technical Administrator",
  ],
  "members.view_private": [
    "VP / FS Coordinator", "General Secretary", "President / Executive", "Technical Administrator",
  ],
  "members.edit_role": ["President / Executive", "Technical Administrator"],
  "members.edit_status": ["President / Executive", "Technical Administrator"],
  "academic.rollover": ["General Secretary", "President / Executive", "Technical Administrator"],
  "website.edit_draft": ["Publicity Coordinator", "President / Executive", "Technical Administrator"],
  "website.publish": ["Publicity Coordinator", "President / Executive", "Technical Administrator"],
  "bible_study.create": ["Bible Study Coordinator", "President / Executive", "Technical Administrator"],
  "bible_study.publish": ["Bible Study Coordinator", "President / Executive", "Technical Administrator"],
  "fs.admissions.review": ["VP / FS Coordinator", "President / Executive", "Technical Administrator"],
  "fs.students.grade": ["FS Teacher", "VP / FS Coordinator", "President / Executive"],
  "fs.students.record_completion": ["VP / FS Coordinator", "President / Executive"],
  "events.create_edit": ["Publicity Coordinator", "General Secretary", "President / Executive", "Technical Administrator"],
  "announcements.publish": ["Publicity Coordinator", "General Secretary", "President / Executive", "Technical Administrator"],
  "media.upload": ["Publicity Coordinator", "President / Executive", "Technical Administrator"],
  "governance.approve": ["President / Executive"],
  "system.logs.view": ["President / Executive", "Technical Administrator"],
} as const;

export type PermissionKey = keyof typeof permissions;