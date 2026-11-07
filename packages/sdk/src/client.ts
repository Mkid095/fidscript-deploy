/**
 * SDK client barrel — re-exports `FidscriptClient` and `FidscriptClientOptions`
 * from `./client-core` so existing internal imports (`from '../client'`) continue
 * to work. The implementation plus error-mapping/retry helpers live in
 * `./client-core` to satisfy the ANPAS 150-line limit.
 */
export { FidscriptClient, FidscriptClientOptions } from './client-core';
export { FidscriptError, AuthError, NotFoundError, ValidationError, RateLimitError } from './modules/errors';
