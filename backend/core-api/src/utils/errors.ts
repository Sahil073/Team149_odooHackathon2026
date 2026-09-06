// isOperational distinguishes expected errors (bad input, missing record) from bugs —
// error.middleware.ts uses this to decide what's safe to show the client vs log-and-mask.
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class BadRequestError extends AppError {
    constructor(message = 'Bad request') {
        super(message, 400);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Conflict') {
        super(message, 409);
    }
}

// For zod/schema validation failures — carries field-level detail
export class ValidationError extends AppError {
    public readonly details: unknown;

    constructor(message = 'Validation failed', details?: unknown) {
        super(message, 422);
        this.details = details;
    }
}

// Smart-layer timeout/failure per ICD §5 — caller decides the fallback, this just signals it
export class SmartLayerUnavailableError extends AppError {
    constructor(message = 'Smart layer did not respond in time') {
        super(message, 503, true);
    }
}

export class InternalServerError extends AppError {
    constructor(message = 'Internal server error') {
        super(message, 500, false);
    }
}