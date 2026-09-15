import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { mediaAssets, mediaPlacements } from "../../db/schema/index.js";

export async function createAsset(input: typeof mediaAssets.$inferInsert) {
  const [asset] = await db.insert(mediaAssets).values(input).returning();
  return asset;
}

export async function listAssets() {
  return db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
}

export async function findAssetById(id: string) {
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  return asset ?? null;
}

export async function findPlacementByKey(key: string) {
  const [row] = await db
    .select({ placement: mediaPlacements, asset: mediaAssets })
    .from(mediaPlacements)
    .leftJoin(mediaAssets, eq(mediaPlacements.currentAssetId, mediaAssets.id))
    .where(eq(mediaPlacements.key, key))
    .limit(1);
  return row ?? null;
}

export async function listPlacements(keys?: string[]) {
  const condition = keys?.length ? inArray(mediaPlacements.key, keys) : undefined;
  return db
    .select({ placement: mediaPlacements, asset: mediaAssets })
    .from(mediaPlacements)
    .leftJoin(mediaAssets, eq(mediaPlacements.currentAssetId, mediaAssets.id))
    .where(condition)
    .orderBy(mediaPlacements.key);
}

export async function assignAsset(key: string, assetId: string, assignedBy: string) {
  const [placement] = await db
    .update(mediaPlacements)
    .set({ currentAssetId: assetId, assignedBy, updatedAt: new Date() })
    .where(eq(mediaPlacements.key, key))
    .returning();
  return placement ?? null;
}

export async function updateAssetAltText(id: string, altText: string | undefined) {
  const [asset] = await db
    .update(mediaAssets)
    .set({ altText, updatedAt: new Date() })
    .where(eq(mediaAssets.id, id))
    .returning();
  return asset ?? null;
}

export async function findPlacementUsingAsset(assetId: string) {
  const [placement] = await db
    .select()
    .from(mediaPlacements)
    .where(and(eq(mediaPlacements.currentAssetId, assetId)))
    .limit(1);
  return placement ?? null;
}

export async function deleteAsset(id: string) {
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
}
