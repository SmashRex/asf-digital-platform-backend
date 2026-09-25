import { db } from "../../db/index.js";
import { AppError } from "../../errors/appError.js";
import * as repo from "./bibleStudy.repository.js";
import type { CreateBibleStudyInput, UpdateBibleStudyInput } from "./bibleStudy.validation.js";
import type { CreateSeriesInput } from "./bibleStudy.validation.js";
import { isTuesday, generateWeeklySchedule } from "../../utils/bibleStudySchedule.js";

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

// ---- Bible Study Series ----

export async function createSeriesWithLessons(input: CreateSeriesInput, createdBy: string) {
  if (!isTuesday(input.startDate)) {
    throw AppError.badRequest("The series start date must be a Tuesday", "START_DATE_NOT_TUESDAY");
  }
  if (input.lessons.length === 0) {
    throw AppError.badRequest("A series must include at least one lesson", "NO_LESSONS_PROVIDED");
  }

  const sortedLessons = [...input.lessons].sort((a, b) => a.lessonNumber - b.lessonNumber);

  const lessonNumbers = sortedLessons.map((l) => l.lessonNumber);
  const expectedSequence = Array.from({ length: sortedLessons.length }, (_, i) => i + 1);
  const isSequential = lessonNumbers.every((n, i) => n === expectedSequence[i]);
  if (!isSequential) {
    throw AppError.badRequest(
      "Lesson numbers must be a sequential series starting at 1, with no gaps or duplicates",
      "INVALID_LESSON_SEQUENCE"
    );
  }

  const scheduledDates = generateWeeklySchedule(input.startDate, sortedLessons.length);

  return db.transaction(async (tx) => {
    const series = await repo.createSeriesTx(
      tx,
      { title: input.title, theme: input.theme, startDate: input.startDate, academicSessionId: input.academicSessionId },
      createdBy
    );

    const lessonsWithSchedule = sortedLessons.map((lesson, index) => ({
      ...lesson,
      title: lesson.title ?? lesson.topic,
      scheduledDate: scheduledDates[index],
      studyDate: scheduledDates[index]
    }));

    const savedLessons = await repo.bulkCreateLessonsTx(tx, series!.id, lessonsWithSchedule, createdBy);

    return { series, lessons: savedLessons };
  });
}

export async function getSeriesById(id: string, canSeeUnpublished: boolean) {
  const series = await repo.findSeriesById(id);
  if (!series) {
    throw AppError.notFound("Bible Study series not found", "SERIES_NOT_FOUND");
  }
  const lessons = await repo.findLessonsBySeriesId(id);
  const visibleLessons = canSeeUnpublished ? lessons : lessons.filter((l) => l.publicationStatus === "published");
  return { series, lessons: visibleLessons };
}