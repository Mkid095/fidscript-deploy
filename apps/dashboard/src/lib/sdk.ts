/**
 * Single source of truth for the API base URL.
 *
 * The Docker build sets NEXT_PUBLIC_API_URL as a build arg (see
 * apps/dashboard/Dockerfile). At runtime, this is the only place the
 * dashboard reads it — every createFidscript call goes through here.
 *
 * If the URL is missing, that's a build configuration error and we throw
 * with a clear message instead of silently using a hardcoded fallback.
 */
import { createFidscript, type FidscriptSDK } from '@fidscript/sdk';

const RAW_URL = process.env.NEXT_PUBLIC_API_URL;

if (!RAW_URL) {
  // Surface the error in the browser console early; createFidscript will
  // also throw with the missing baseURL message when actually called.
  // eslint-disable-next-line no-console
  console.error('[sdk] NEXT_PUBLIC_API_URL is not set — check the dashboard Docker build args.');
}

// Strip trailing /api since the SDK prepends /api/v1 to every route.
// Dashboard build arg: https://deploy.fidscript.com/api  →  axios baseURL: https://deploy.fidscript.com
export const API_BASE_URL = RAW_URL?.replace(/\/api$/, '') ?? '';

export function makeSdk(apiKey?: string): FidscriptSDK {
  if (!API_BASE_URL) {
    throw new Error(
      'API base URL is not configured. The dashboard was built without NEXT_PUBLIC_API_URL — ' +
      'rebuild with --build-arg NEXT_PUBLIC_API_URL=https://your-api-host/api.',
    );
  }
  return createFidscript({ baseURL: API_BASE_URL, apiKey });
}
