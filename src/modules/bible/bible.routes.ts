import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { listTranslations, listBooks, getChapter, search } from "./bible.controller.js";

export const bibleRouter = Router();

bibleRouter.get("/translations", requireAuth, listTranslations);
bibleRouter.get("/books", requireAuth, listBooks);
bibleRouter.get("/search", requireAuth, search);
bibleRouter.get("/:translationId/:bookId/:chapter", requireAuth, getChapter);