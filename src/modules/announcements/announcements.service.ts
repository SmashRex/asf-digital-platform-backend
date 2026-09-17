import { AppError } from "../../errors/appError.js";
import * as repo from "./announcements.repository.js";
import type { CreateAnnouncementInput } from "./announcements.validation.js";

export async function createAnnouncement(input: CreateAnnouncementInput, createdBy: string) {
  return repo.createAnnouncement({
    ...input,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    createdBy,
  });
}

export async function getAnnouncements(includeUnpublished: boolean) {
  return repo.listAnnouncements(includeUnpublished);
}

export async function publishAnnouncement(id: string) {
  const existing = await repo.findById(id);
  if (!existing) {
    throw AppError.notFound("Announcement not found", "ANNOUNCEMENT_NOT_FOUND");
  }
  if (existing.publicationStatus === "published") {
    throw AppError.conflict("This announcement is already published", "ALREADY_PUBLISHED");
  }
  return repo.publishAnnouncement(id);
}