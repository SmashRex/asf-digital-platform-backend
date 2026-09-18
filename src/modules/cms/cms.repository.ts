import { db } from "../../db/index.js";
import { websiteConfigurations, websiteSections } from "../../db/schema/index.js";
import { eq, asc } from "drizzle-orm";
import { defaultCopy, defaultSections } from "../../config/websiteDefaults.config.js";

export async function getConfigWithSections(status: "draft" | "published") {
  const rows = await db.select().from(websiteConfigurations).where(eq(websiteConfigurations.status, status));
  const config = rows[0] ?? null;
  if (!config) return null;

  const sections = await db
    .select()
    .from(websiteSections)
    .where(eq(websiteSections.configId, config.id))
    .orderBy(asc(websiteSections.order));

  return { ...config, sections };
}

export async function createDefaultConfig(status: "draft" | "published", updatedBy?: string) {
  const [config] = await db
    .insert(websiteConfigurations)
    .values({ status, copy: defaultCopy, updatedBy })
    .returning();

  for (const section of defaultSections) {
    await db.insert(websiteSections).values({
      configId: config.id,
      sectionKey: section.sectionKey,
      type: section.type,
      title: section.title,
      isCore: section.isCore,
      order: section.order,
      configuration: {},
      items: [],
    });
  }

  return getConfigWithSections(status);
}

export async function updateDraft(configId: string, copy: any, updatedBy: string) {
  const [row] = await db
    .update(websiteConfigurations)
    .set({ copy, updatedBy, updatedAt: new Date() })
    .where(eq(websiteConfigurations.id, configId))
    .returning();
  return row;
}

export async function replaceSections(configId: string, sections: any[], updatedBy: string) {
  await db.delete(websiteSections).where(eq(websiteSections.configId, configId));
  for (const section of sections) {
    await db.insert(websiteSections).values({
      configId,
      sectionKey: section.sectionKey ?? section.id,
      type: section.type,
      title: section.title,
      subtitle: section.subtitle ?? null,
      description: section.description ?? null,
      imageUrl: section.imageUrl ?? null,
      items: section.items ?? [],
      configuration: section.configuration ?? {},
      isCore: section.isCore ?? false,
      order: section.order,
      isVisible: section.isVisible ?? true,
      updatedBy,
    });
  }
}

export async function bumpVersionAndPublish(publishedConfigId: string, draftCopy: any, publishedBy: string, newVersion: number) {
  const [published] = await db
    .update(websiteConfigurations)
    .set({ copy: draftCopy, version: newVersion, publishedBy, publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(websiteConfigurations.id, publishedConfigId))
    .returning();
  return published;
}