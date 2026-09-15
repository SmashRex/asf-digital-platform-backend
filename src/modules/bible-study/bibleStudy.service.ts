import { AppError } from "../../errors/appError.js";
import * as repo from "./bibleStudy.repository.js";
import type { CreateBibleStudyInput, UpdateBibleStudyInput } from "./bibleStudy.validation.js";

export async function getStudies(canSeeUnpublished: boolean) {
  return repo.listStudies(canSeeUnpublished);
}

export async function getCurrentStudy() {
  const study = await repo.findCurrentStudy();
  if (!study) {
    throw AppError.notFound("No current Bible Study lesson is available", "NO_CURRENT_STUDY");
  }
  return study;
}

export async function getStudyById(id: string, canSeeUnpublished: boolean) {
  const study = await repo.findById(id);
  if (!study) {
    throw AppError.notFound("Bible Study lesson not found", "STUDY_NOT_FOUND");
  }
  if (study.publicationStatus !== "published" && !canSeeUnpublished) {
    throw AppError.forbidden("This lesson has not been published yet", "STUDY_NOT_PUBLISHED");
  }
  return study;
}

export async function createStudy(input: CreateBibleStudyInput, createdBy: string) {
  return repo.create(input, createdBy);
}

export async function updateStudy(id: string, input: UpdateBibleStudyInput) {
  const existing = await repo.findById(id);
  if (!existing) {
    throw AppError.notFound("Bible Study lesson not found", "STUDY_NOT_FOUND");
  }
  return repo.update(id, input);
}

export async function publishStudy(id: string, publishedBy: string) {
  const existing = await repo.findById(id);
  if (!existing) {
    throw AppError.notFound("Bible Study lesson not found", "STUDY_NOT_FOUND");
  }
  if (existing.publicationStatus === "published") {
    throw AppError.conflict("This lesson is already published", "ALREADY_PUBLISHED");
  }
  return repo.publish(id, publishedBy);
}