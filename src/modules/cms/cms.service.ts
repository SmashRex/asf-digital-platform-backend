import { AppError } from "../../errors/appError.js";
import * as repo from "./cms.repository.js";
import type { SaveDraftInput } from "./cms.validation.js";

function toResponseShape(config: any) {
  return {
    id: config.id,
    version: config.version,
    status: config.status,
    copy: config.copy,
    sections: config.sections,
    updatedBy: config.updatedBy,
    publishedAt: config.publishedAt,
  };
}

export async function getPublished() {
  let config = await repo.getConfigWithSections("published");
  if (!config) {
    config = await repo.createDefaultConfig("published");
  }
  return toResponseShape(config!);
}

export async function getDraft() {
  let config = await repo.getConfigWithSections("draft");
  if (!config) {
    config = await repo.createDefaultConfig("draft");
  }
  return toResponseShape(config!);
}

export async function saveDraft(input: SaveDraftInput, userId: string) {
  let draft = await repo.getConfigWithSections("draft");
  if (!draft) {
    draft = await repo.createDefaultConfig("draft");
  }
  await repo.updateDraft(draft!.id, input.copy, userId);
  await repo.replaceSections(draft!.id, input.sections, userId);
  const updated = await repo.getConfigWithSections("draft");
  return toResponseShape(updated!);
}

export async function publish(userId: string) {
  const draft = await repo.getConfigWithSections("draft");
  if (!draft) {
    throw AppError.notFound("No draft exists yet", "DRAFT_NOT_FOUND");
  }
  let published = await repo.getConfigWithSections("published");
  if (!published) {
    published = await repo.createDefaultConfig("published");
  }
  const newVersion = (published!.version ?? 0) + 1;
  await repo.bumpVersionAndPublish(published!.id, draft.copy, userId, newVersion);
  await repo.replaceSections(published!.id, draft.sections, userId);
  const updated = await repo.getConfigWithSections("published");
  return toResponseShape(updated!);
}

export async function discardDraft(userId: string) {
  const published = await repo.getConfigWithSections("published");
  if (!published) {
    throw AppError.notFound("No published version exists yet", "PUBLISHED_NOT_FOUND");
  }
  let draft = await repo.getConfigWithSections("draft");
  if (!draft) {
    draft = await repo.createDefaultConfig("draft");
  }
  await repo.updateDraft(draft!.id, published.copy, userId);
  await repo.replaceSections(draft!.id, published.sections, userId);
  const updated = await repo.getConfigWithSections("draft");
  return toResponseShape(updated!);
}

export async function factoryReset(userId: string) {
  let draft = await repo.getConfigWithSections("draft");
  if (!draft) {
    draft = await repo.createDefaultConfig("draft");
  }
  const { defaultCopy, defaultSections } = await import("../../config/websiteDefaults.config.js");
  await repo.updateDraft(draft!.id, defaultCopy, userId);
  await repo.replaceSections(
    draft!.id,
    defaultSections.map((s) => ({ ...s, items: [], configuration: {} })),
    userId
  );
  const updated = await repo.getConfigWithSections("draft");
  return toResponseShape(updated!);
}