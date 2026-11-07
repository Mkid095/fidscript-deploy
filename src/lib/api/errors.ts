/**
 * A failure the platform reported.
 *
 * It carries the status and the platform's own code, so a screen can say
 * **what** went wrong instead of "something went wrong".
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The message the platform sent, whichever shape it came in. */
export function messageFrom(payload: unknown, status: number): { message: string; code?: string } {
  const body = payload as { message?: string | string[]; error?: string } | null;
  const raw = body?.message;
  return {
    message: Array.isArray(raw)
      ? raw.join(', ')
      : (raw ?? `The platform answered ${status}`),
    code: body?.error,
  };
}
