import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import { createBibleStudySchema, updateBibleStudySchema, createSeriesSchema } from "./bibleStudy.validation.js";
import * as service from "./bibleStudy.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";
import { permissions } from "../../config/permissions.config.js";
import { extractAllStudies } from "../../utils/pdfOutlineExtractor.js";
import * as aliasRepo from "./outlineAliases.repository.js";
import * as bookAliasRepo from "./bibleBookAliases.repository.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are accepted"));
    }
    cb(null, true);
  },
});

export const uploadMiddleware = upload.single("file");

function hasPermission(req: Request, key: keyof typeof permissions): boolean {
  return req.user!.roles.some((role) => (permissions[key] as readonly string[]).includes(role));
}

export async function current(req: Request, res: Response, next: NextFunction) {
  try {
    res.set("Cache-Control", "public, max-age=3600");
    const study = await service.getCurrentStudy();
    return sendSuccess(res, study);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createBibleStudySchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid lesson data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const study = await service.createStudy(parsed.data, req.user!.id);
    return sendSuccess(res, study, "Lesson created", undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateBibleStudySchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid lesson data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const study = await service.updateStudy(req.params.id as string, parsed.data);
    return sendSuccess(res, study, "Lesson updated");
  } catch (err) {
    next(err);
  }
}

export async function publish(req: Request, res: Response, next: NextFunction) {
  try {
    const study = await service.publishStudy(req.params.id as string, req.user!.id);
    return sendSuccess(res, study, "Lesson published");
  } catch (err) {
    next(err);
  }
}

export async function uploadOutline(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw AppError.badRequest("No PDF file was uploaded", "NO_FILE");
    }

    let extractedText: string;
    try {
      const parser = new PDFParse({ data: req.file.buffer });
      try {
        extractedText = (await parser.getText()).text;
      } finally {
        await parser.destroy();
      }
    } catch (parseErr) {
      throw AppError.badRequest(
        "This file could not be read as a PDF. Make sure it's a real, uncorrupted PDF file.",
        "INVALID_PDF"
      );
    }

    if (extractedText.trim().length < 20) {
      throw AppError.badRequest(
        "This PDF does not contain enough extractable text. Scanned PDFs are not supported; upload a text-based PDF.",
        "PDF_TEXT_NOT_FOUND"
      );
    }

    const aliasMap = await aliasRepo.loadAliasMap();
    const studies = await extractAllStudies(
      extractedText,
      aliasMap,
      bookAliasRepo.resolveBookByAlias,
      bookAliasRepo.resolveBooksByAlias
    );
    const includeRawText = req.query.includeRawText === "true";

    return sendSuccess(
      res,
      {
        studiesFound: studies.length,
        studies,
        ...(includeRawText ? { rawText: extractedText } : {}),
      },
      `Detected ${studies.length} ${studies.length === 1 ? "study" : "studies"} in this document. Review and correct each before saving.`
    );
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const canSeeUnpublished = hasPermission(req, "bible_study.create");
    const studies = await service.getStudies(canSeeUnpublished);
    res.set("Cache-Control", canSeeUnpublished ? "private, no-store" : "public, max-age=300");
    return sendSuccess(res, studies);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const canSeeUnpublished = hasPermission(req, "bible_study.create");
    const study = await service.getStudyById(req.params.id as string, canSeeUnpublished);
    res.set("Cache-Control", study.publicationStatus === "published" ? "public, max-age=3600" : "private, no-store");
    return sendSuccess(res, study);
  } catch (err) {
    next(err);
  }
}

// ---- Bible Study Series ----

export async function createSeries(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createSeriesSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid series data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const result = await service.createSeriesWithLessons(parsed.data, req.user!.id);
    return sendSuccess(res, result, "Series created", undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function getSeries(req: Request, res: Response, next: NextFunction) {
  try {
    const canSeeUnpublished = hasPermission(req, "bible_study.create");
    const result = await service.getSeriesById(req.params.id as string, canSeeUnpublished);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}