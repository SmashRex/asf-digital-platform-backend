import type { Request, Response, NextFunction } from "express";
import { updateProfileSchema } from "./users.validation.js";
import * as usersRepository from "./users.repository.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";

export async function getMyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await usersRepository.getProfile(req.user!.id);
    return sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
}

export async function updateMyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid profile data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }

    const updated = await usersRepository.updateProfile(req.user!.id, parsed.data);
    return sendSuccess(res, updated, "Profile updated successfully");
  } catch (err) {
    next(err);
  }
}