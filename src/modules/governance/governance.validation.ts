import { z } from "zod";

const uuid = z.string().uuid();
const officeAssignment = z.object({ userId: uuid, officeId: z.string().trim().min(1).max(60) }).strict();
const dashboardGrant = z.object({ userId: uuid, dashboardId: z.string().trim().min(1).max(60) }).strict();
const capabilityGrant = z.object({ userId: uuid, capabilityId: z.string().trim().min(1).max(60) }).strict();

export const createRequestSchema = z.discriminatedUnion("requestType", [
  z.object({ requestType: z.literal("office_assignment"), payload: officeAssignment }),
  z.object({ requestType: z.literal("dashboard_grant"), payload: dashboardGrant }),
  z.object({ requestType: z.literal("capability_grant"), payload: capabilityGrant }),
]);

export const rejectRequestSchema = z.object({ reason: z.string().trim().min(1).max(1000) });
export type CreateRequestInput = z.infer<typeof createRequestSchema>;