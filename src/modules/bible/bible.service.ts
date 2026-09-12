import { AppError } from "../../errors/appError.js";
import * as repo from "./bible.repository.js";

export async function getChapterContent(translationId: string, bookId: string, chapter: number) {
  const translation = await repo.findTranslation(translationId);
  if (!translation) {
    throw AppError.notFound("Translation not found", "TRANSLATION_NOT_FOUND");
  }
  if (translation.sourceType === "external") {
    throw AppError.badRequest(
      "This translation is not yet available for reading — external translation support is coming soon",
      "EXTERNAL_TRANSLATION_NOT_IMPLEMENTED"
    );
  }

  const book = await repo.findBook(bookId);
  if (!book) {
    throw AppError.notFound("Book not found", "BOOK_NOT_FOUND");
  }
  if (chapter > book.chapterCount) {
    throw AppError.badRequest(`${book.name} only has ${book.chapterCount} chapters`, "INVALID_CHAPTER");
  }

  const verses = await repo.getChapter(translationId, bookId, chapter);
  if (verses.length === 0) {
    throw AppError.notFound("No verses found for this chapter in this translation", "CHAPTER_NOT_FOUND");
  }

  return { translation: translation.name, book: book.name, chapter, verses };
}

export async function searchBible(translationId: string, query: string, limit: number) {
  const translation = await repo.findTranslation(translationId);
  if (!translation) {
    throw AppError.notFound("Translation not found", "TRANSLATION_NOT_FOUND");
  }
  if (translation.sourceType === "external") {
    throw AppError.badRequest(
      "Search is not yet available for external translations",
      "EXTERNAL_TRANSLATION_NOT_IMPLEMENTED"
    );
  }

  return repo.searchVerses(translationId, query, limit);
}