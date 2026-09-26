import type { AuthenticatedUser } from "../../modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
      authorization?: {
        accountStatus: string;
        executiveOffices: { id: string; name: string }[];
        dashboardIds: string[];
        capabilityIds: string[];
        permissionKeys: string[];
      };
    }
  }
}

export {};