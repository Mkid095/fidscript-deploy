// Phase 16 — consolidated SDK error types

export class FidscriptError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'FidscriptError';
  }
}

export class AuthError extends FidscriptError {
  constructor(message: string, statusCode = 401) {
    super(message, statusCode, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

export class NotFoundError extends FidscriptError {
  constructor(resource: string, id: string) {
    super(`${resource} '${id}' not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends FidscriptError {
  constructor(message: string) {
    super(message, 422, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends FidscriptError {
  constructor(retryAfterMs?: number) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT');
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
  retryAfterMs?: number;
}
