import { z } from "zod";

export const createBibleStudySchema = z.object({
  lessonNumber: z.number().int().positive(),
  title: z.string().trim().min(2).max(255),
  topic: z.string().trim().min(2).max(255),
  theme: z.string().trim().min(2).max(255),
  studyDate: z.string().date(),
  textRef: z.string().trim().min(2).max(255),
  textContent: z.string().trim().optional(),
  memoryVerseRef: z.string().trim().min(2).max(100),
  memoryVerseText: z.string().trim().min(2),
  aim: z.string().trim().min(2),
  introduction: z.string().trim().min(2),
  studyGuide: z.array(z.string()).default([]),
  discussionQuestions: z.array(z.string()).default([]),
  conclusion: z.string().trim().min(2),
  prayerPoints: z.array(z.string()).default([]),
});

export const updateBibleStudySchema = createBibleStudySchema.partial();

export type CreateBibleStudyInput = z.infer<typeof createBibleStudySchema>;
export type UpdateBibleStudyInput = z.infer<typeof updateBibleStudySchema>;

// ---- Bible Study Series ----

const seriesLessonSchema = z.object({
  lessonNumber: z.number().int().positive(),
  title: z.string().trim().min(2).max(255).optional(),
  topic: z.string().trim().min(2).max(255),
  theme: z.string().trim().min(2).max(255),
  textRef: z.string().trim().min(2).max(255),
  textContent: z.string().trim().optional(),
  memoryVerseRef: z.string().trim().min(2).max(100),
  memoryVerseText: z.string().trim().min(2),
  aim: z.string().trim().min(2),
  introduction: z.string().trim().min(2),
  studyGuide: z.array(z.string()).default([]),
  discussionQuestions: z.array(z.string()).default([]),
  conclusion: z.string().trim().min(2),
  prayerPoints: z.array(z.string()).default([]),
});

export const createSeriesSchema = z.object({
  title: z.string().trim().min(2).max(255),
  theme: z.string().trim().min(2).max(255).optional(),
  startDate: z.string().date(),
  academicSessionId: z.string().trim().min(1).optional(),
  lessons: z.array(seriesLessonSchema).min(1, "A series must include at least one lesson"),
});

export type CreateSeriesInput = z.infer<typeof createSeriesSchema>;