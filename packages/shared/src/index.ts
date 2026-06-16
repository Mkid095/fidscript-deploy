// Shared utilities for FIDScript platform

export const API_PREFIX = '/api/v1';

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const PROJECT_STATUS = {
  PENDING: 'pending',
  BUILDING: 'building',
  DEPLOYED: 'deployed',
  FAILED: 'failed',
  DELETED: 'deleted',
} as const;

export const DEPLOYMENT_STATUS = {
  PENDING: 'pending',
  BUILDING: 'building',
  DEPLOYED: 'deployed',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled_back',
} as const;

export const USER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  VIEWER: 'viewer',
} as const;

// Validation patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  DOMAIN: /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/,
  SUBDOMAIN: /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
  PAGINATION_PAGE: /^[1-9]\d*$/,
  PAGINATION_LIMIT: /^([1-9]|[1-9]\d|100)$/,
};

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  INTERNAL_ERROR: 'An unexpected error occurred',
  RATE_LIMITED: 'Too many requests, please try again later',
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Cache TTLs in seconds
export const CACHE_TTL = {
  SHORT: 60,      // 1 minute
  MEDIUM: 300,    // 5 minutes
  LONG: 3600,     // 1 hour
  VERY_LONG: 86400, // 24 hours
};

// ID prefix constants
export const ID_PREFIX = {
  USER: 'usr_',
  SESSION: 'ses_',
  PROJECT: 'prj_',
  DEPLOYMENT: 'dpl_',
  DATABASE: 'db_',
  DOMAIN: 'dom_',
  FUNCTION: 'fn_',
  QUEUE: 'q_',
  CRON: 'cron_',
  STORAGE: 'sto_',
  API_KEY: 'key_',
};
