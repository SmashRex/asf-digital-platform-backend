import type { Request, Response, NextFunction } from "express";
import { createEventSchema, updateEventSchema } from "./events.validation.js";
import * as service from "./events.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const filter = req.query.filter as "upcoming" | "past" | undefined;
    const data = await service.getEvents(filter);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function featured(req: Request, res: Response, next: NextFunction) {
  try {
    const event = await service.getFeaturedEvent();
    return sendSuccess(res, event);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) throw AppError.badRequest("Invalid event data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    const event = await service.createEvent(parsed.data, req.user!.id);
    return sendSuccess(res, event, "Event created", undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateEventSchema.safeParse(req.body);
    if (!parsed.success) throw AppError.badRequest("Invalid event data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    const event = await service.updateEvent(req.params.id as string, parsed.data);
    return sendSuccess(res, event, "Event updated");
  } catch (err) {
    next(err);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const event = await service.cancelEvent(req.params.id as string);
    return sendSuccess(res, event, "Event cancelled");
  } catch (err) {
    next(err);
  }
}