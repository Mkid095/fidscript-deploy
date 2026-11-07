import { NextResponse, type NextRequest } from 'next/server';

/**
 * The path, for the server.
 *
 * A server component does not know which page it is on. The top bar needs it
 * to mark the current destination, and the sign-in redirect needs it to
 * remember where the person was going.
 *
 * So the path is carried on the request, as a header. The API proxy is left
 * alone — it is not a page.
 *
 * And the session is kept alive here. The access token is short-lived, and
 * the refresh token is the one that lasts — but a server-rendered page
 * reads the access token from the request, so when it has expired the
 * person would be sent back to the sign-in even though their session is
 * still good. The refresh happens once, here, and the fresh pair is put
 * on the request (so the page sees it) and on the response (so the browser
 * keeps it).
 */
const ACCESS_COOKIE = 'fidscript_access';
const REFRESH_COOKIE = 'fidscript_refresh';
const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/console/api/')) {
    return NextResponse.next();
  }

  const headers = new Headers(request.headers);
  headers.set('x-pathname', request.nextUrl.pathname + request.nextUrl.search);

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  // Nothing to keep alive, or the access token is still good.
  if (!access || !refreshToken || !hasExpired(access)) {
    return NextResponse.next({ request: { headers } });
  }

  const renewed = await refresh(refreshToken);
  if (renewed === null || renewed === 'unreachable') {
    // The API could not be reached — that is not the session's fault, and
    // the person is not signed out over it. The page will say what it can.
    if (renewed === 'unreachable') {
      return NextResponse.next({ request: { headers } });
    }

    // The session is over. Say so with the cookies, and let the page send
    // the person to the sign-in.
    const response = NextResponse.next({ request: { headers } });
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  // The page reads the cookies off the request, so the fresh pair goes on
  // the request too — and on the response, so the browser keeps it. The
  // old access token is taken off the header first: two of them, and the
  // page would read the expired one.
  const carried = (request.headers.get('cookie') ?? '')
    .split('; ')
    .filter((entry) => entry.length > 0 && !entry.startsWith(`${ACCESS_COOKIE}=`))
    .concat(`${ACCESS_COOKIE}=${renewed.accessToken}`)
    .join('; ');
  headers.set('cookie', carried);
  const response = NextResponse.next({ request: { headers } });
  response.cookies.set(ACCESS_COOKIE, renewed.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ACCESS_MAX_AGE,
  });
  response.cookies.set(REFRESH_COOKIE, renewed.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: REFRESH_MAX_AGE,
  });
  return response;
}

/**
 * Whether the access token has run out.
 *
 * The token is a JWT, so the expiry is in its payload — read here, not
 * checked: the API decides for real whether the token is good. A token
 * that cannot be read is left alone.
 */
function hasExpired(token: string): boolean {
  try {
    const payload = JSON.parse(decodeBase64Url(token.split('.')[1])) as { exp?: number };
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

/** The payload of a JWT, which is base64url and is not always padded. */
function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return atob(padded);
}

/**
 * Spends the refresh token once and returns the new pair.
 *
 * `null` means the session is over. `'unreachable'` means the API could
 * not be asked — which is not the same thing, and does not end a session.
 */
async function refresh(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null | 'unreachable'> {
  try {
    const response = await fetch(new URL('/api/v1/auth/refresh', API_URL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!response.ok) return null;

    const body = (await response.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!body.accessToken) return null;
    return {
      accessToken: body.accessToken,
      refreshToken: body.refreshToken ?? refreshToken,
    };
  } catch {
    return 'unreachable';
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.svg$).*)'],
};
