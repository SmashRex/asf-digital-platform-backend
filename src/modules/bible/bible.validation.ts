import { z } from "zod";

export const chapterParamsSchema = z.object({
  translationId: z.string().trim().min(1),
  bookId: z.string().trim().min(1),
  chapter: z.coerce.number().int().min(1),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, "Search query must be at least 2 characters"),
  translationId: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});