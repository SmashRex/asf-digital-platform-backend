import { AppError } from "../../errors/appError.js";
import * as repo from "./announcements.repository.js";
import type { CreateAnnouncementInput, EditAnnouncementInput } from "./announcements.validation.js";

export async function createAnnouncement(input: CreateAnnouncementInput, createdBy: string) {
  const announcement = await repo.createAnnouncement({
    ...input,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    createdBy,
  });

  if (input.isUrgent) {
    return repo.updateStatus(announcement.id, {
      status: "Published",
      publishedBy: createdBy,
      publishedAt: new Date(),
    });
  }
  return announcement;
}

export async function getAnnouncements(includeAll: boolean) {
  return repo.listAnnouncements(includeAll);
}

export async function submitForReview(id: string) {
  const existing = await repo.findById(id);
  if (!existing) throw AppError.notFound("Announcement not found", "ANNOUNCEMENT_NOT_FOUND");
  if (existing.status !== "Draft") throw AppError.conflict("Only drafts can be submitted for review", "INVALID_STATUS");
  return repo.updateStatus(id, { status: "Pending Review" });
}

export async function approve(id: string, approvedBy: string) {
  const existing = await repo.findById(id);
  if (!existing) throw AppError.notFound("Announcement not found", "ANNOUNCEMENT_NOT_FOUND");
  if (existing.status !== "Pending Review") throw AppError.conflict("Only announcements pending review can be approved", "INVALID_STATUS");
  return repo.updateStatus(id, { status: "Approved", approvedBy, approvedAt: new Date() });
}

export async function requestRevision(id: string, notes: string) {
  const existing = await repo.findById(id);
  if (!existing) throw AppError.notFound("Announcement not found", "ANNOUNCEMENT_NOT_FOUND");
  if (existing.status !== "Pending Review") throw AppError.conflict("Only announcements pending review can be sent for revision", "INVALID_STATUS");
  return repo.updateStatus(id, { status: "Revision Requested", revisionNotes: notes });
}

export async function editAfterRevision(id: string, input: EditAnnouncementInput) {
  const existing = await repo.findById(id);
  if (!existing) throw AppError.notFound("Announcement not found", "ANNOUNCEMENT_NOT_FOUND");
  if (existing.status !== "Revision Requested") throw AppError.conflict("This announcement is not awaiting revision", "INVALID_STATUS");
  return repo.updateContent(id, input);
}

export async function publish(id: string, publishedBy: string) {
  const existing = await repo.findById(id);
  if (!existing) throw AppError.notFound("Announcement not found", "ANNOUNCEMENT_NOT_FOUND");
  if (existing.status !== "Approved") throw AppError.conflict("Only approved announcements can be published", "INVALID_STATUS");
  return repo.updateStatus(id, { status: "Published", publishedBy, publishedAt: new Date() });
}

export async function archive(id: string) {
  const existing = await repo.findById(id);
  if (!existing) throw AppError.notFound("Announcement not found", "ANNOUNCEMENT_NOT_FOUND");
  if (existing.status !== "Published") throw AppError.conflict("Only published announcements can be archived", "INVALID_STATUS");
  return repo.updateStatus(id, { status: "Archived", archivedAt: new Date() });
}