export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details: unknown;

  constructor(message: string, statusCode: number, code: string, details: unknown = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = "BAD_REQUEST", details: unknown = null) {
    return new AppError(message, 400, code, details);
  }
  static unauthorized(message = "Unauthorized", code = "UNAUTHORIZED") {
    return new AppError(message, 401, code);
  }
  static forbidden(message = "Forbidden", code = "FORBIDDEN") {
    return new AppError(message, 403, code);
  }
  static notFound(message = "Resource not found", code = "NOT_FOUND") {
    return new AppError(message, 404, code);
  }
  static conflict(message: string, code = "CONFLICT") {
    return new AppError(message, 409, code);
  }
  static internal(message = "Internal server error", code = "INTERNAL_ERROR") {
    return new AppError(message, 500, code);
  }
}