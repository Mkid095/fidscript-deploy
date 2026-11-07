import { SetMetadata } from '@nestjs/common';

export const SCOPES_KEY = 'required-scopes';

/**
 * Require specific scopes to access an endpoint.
 * Only enforced for API key callers (fsk_ / fpk_); JWT callers bypass.
 */
export const RequireScope = (...scopes: string[]) => SetMetadata(SCOPES_KEY, scopes);
