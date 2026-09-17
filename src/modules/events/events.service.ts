import { AppError } from "../../errors/appError.js";
import * as repo from "./events.repository.js";
import type { CreateEventInput, UpdateEventInput } from "./events.validation.js";

export async function createEvent(input: CreateEventInput, createdBy: string) {
  return repo.createEvent({
    ...input,
    startTime: new Date(input.startTime),
    endTime: input.endTime ? new Date(input.endTime) : null,
    createdBy,
  });
}

export async function getEvents(filter?: "upcoming" | "past") {
  return repo.listEvents(filter);
}

export async function updateEvent(id: string, input: UpdateEventInput) {
  const existing = await repo.findById(id);
  if (!existing) {
    throw AppError.notFound("Event not found", "EVENT_NOT_FOUND");
  }
  return repo.updateEvent(id, {
    ...input,
    startTime: input.startTime ? new Date(input.startTime) : undefined,
    endTime: input.endTime ? new Date(input.endTime) : undefined,
  });
}

export async function cancelEvent(id: string) {
  const existing = await repo.findById(id);
  if (!existing) {
    throw AppError.notFound("Event not found", "EVENT_NOT_FOUND");
  }
  if (existing.status === "Cancelled") {
    throw AppError.conflict("This event is already cancelled", "ALREADY_CANCELLED");
  }
  return repo.cancelEvent(id);
}