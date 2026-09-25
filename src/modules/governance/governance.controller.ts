import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/appError.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import * as service from "./governance.service.js";
import { createRequestSchema, rejectRequestSchema } from "./governance.validation.js";

export async function create(req: Request, res: Response, next: NextFunction) { try { const parsed = createRequestSchema.safeParse(req.body); if (!parsed.success) throw AppError.badRequest("Invalid governance request", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors); return sendSuccess(res, await service.createRequest(parsed.data, req.user!), "Governance request created", undefined, 201); } catch (error) { next(error); } }
export async function list(req: Request, res: Response, next: NextFunction) { try { const status = req.query.status as "Pending" | "Approved" | "Rejected" | undefined; return sendSuccess(res, await service.listRequests(status)); } catch (error) { next(error); } }
export async function approve(req: Request, res: Response, next: NextFunction) { try { return sendSuccess(res, await service.approveRequest(req.params.id as string, req.user!.id), "Governance request approved"); } catch (error) { next(error); } }
export async function reject(req: Request, res: Response, next: NextFunction) { try { const parsed = rejectRequestSchema.safeParse(req.body); if (!parsed.success) throw AppError.badRequest("A rejection reason is required", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors); return sendSuccess(res, await service.rejectRequest(req.params.id as string, req.user!.id, parsed.data.reason), "Governance request rejected"); } catch (error) { next(error); } }