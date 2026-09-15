import type { Request, Response, NextFunction } from "express";
import { chapterParamsSchema, chapterQuerySchema, searchQuerySchema } from "./bible.validation.js";
import { getChapterContent, searchBible } from "./bible.service.js";
import * as repo from "./bible.repository.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";

export async function listTranslations(req: Request, res: Response, next: NextFunction) {
  try {
    const translations = await repo.listTranslations();
    return sendSuccess(res, translations);
  } catch (err) {
    next(err);
  }
}

export async function listBooks(req: Request, res: Response, next: NextFunction) {
  try {
    const books = await repo.listBooks();
    return sendSuccess(res, books);
  } catch (err) {
    next(err);
  }
}

export async function getChapter(req: Request, res: Response, next: NextFunction) {
  try {
    const parsedParams = chapterParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw AppError.badRequest("Invalid chapter request", "VALIDATION_ERROR", parsedParams.error.flatten().fieldErrors);
    }
    const parsedQuery = chapterQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      throw AppError.badRequest("Invalid verse range", "VALIDATION_ERROR", parsedQuery.error.flatten().fieldErrors);
    }

    const result = await getChapterContent(
      parsedParams.data.translationId,
      parsedParams.data.bookId,
      parsedParams.data.chapter,
      parsedQuery.data.verseStart,
      parsedQuery.data.verseEnd
    );

    res.set("Cache-Control", "public, max-age=86400");
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid search request", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const results = await searchBible(parsed.data.translationId, parsed.data.q, parsed.data.limit);
    return sendSuccess(res, results);
  } catch (err) {
    next(err);
  }
}