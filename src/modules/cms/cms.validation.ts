import { z } from "zod";

const sectionSchema = z.object({
  sectionKey: z.string().optional(),
  id: z.string().optional(),
  type: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  items: z.array(z.any()).optional(),
  configuration: z.record(z.string(), z.any()).optional(),
  isCore: z.boolean().optional(),
  order: z.number().int(),
  isVisible: z.boolean().optional(),
});

export const saveDraftSchema = z.object({
  copy: z.record(z.string(), z.any()),
  sections: z.array(sectionSchema),
});
export type SaveDraftInput = z.infer<typeof saveDraftSchema>;