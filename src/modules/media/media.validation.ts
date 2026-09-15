import { z } from "zod";

export const placementKeySchema = z
  .string()
  .trim()
  .min(3)
  .max(160)
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/, "Invalid media placement key");

export const assignMediaSchema = z.object({
  assetId: z.string().uuid(),
  altText: z.string().trim().max(500).optional(),
});

export const listMediaQuerySchema = z.object({
  keys: z.string().optional(),
});
