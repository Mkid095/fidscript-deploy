import { NextRequest, NextResponse } from 'next/server';

/**
 * The proxy to the platform API.
 *
 * Every call the console makes to the API goes through here, and this is
 * where the session lives:
 *
 *   - the **access token** and the **refresh token** are httpOnly cookies, so
 *     no script on the origin can read them;
 *   - the bearer is attached here, on the server, and never reaches the
 *     browser;
 *   - a sign-in response's tokens are **moved out of the body and into the
 *     cookies**, so the page never sees them;
 *   - on a 401 the refresh token is spent once and the request is retried.
 *
 * A server component calls the API through the same path, with the incoming
 * cookie — so there is one auth mechanism, not two.
 */

const ACCESS_COOKIE = 'fidscript_access';
const REFRESH_COOKIE = 'fidscript_refresh';
// The MFA challenge token — the proof that the password was right, while the
// second factor is still outstanding. It is a bearer token too, so it never
// reaches the browser: the proxy keeps it and attaches it to the challenge.
const MFA_COOKIE = 'fidscript_mfa';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;
const MFA_MAX_AGE = 5 * 60;

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
} as const;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** The upstream call, with the bearer attached. */
async function callApi(
  path: string[],
  request: NextRequest,
  access: string | undefined,
  body: string | undefined,
): Promise<Response> {
  const url = new URL(`/api/v1/${path.map(encodeURIComponent).join('/')}`, API_URL);
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value));

  return fetch(url, {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
    body,
    cache: 'no-store',
  });
}

/** Spends the refresh token once and returns the new pair. */
async function refresh(refreshToken: string): Promise<TokenPair | null> {
  const response = await fetch(new URL('/api/v1/auth/refresh', API_URL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const body = (await response.json()) as Partial<TokenPair>;
  if (!body.accessToken) return null;
  return { accessToken: body.accessToken, refreshToken: body.refreshToken ?? refreshToken };
}

/**
 * The upstream answer, on its way to the browser.
 *
 * The tokens are taken **out** of the body on the way through: what the
 * browser receives is the user, not the credentials.
 */
function toResponse(
  upstream: Response,
  body: string,
  tokens: TokenPair | null,
  mfaToken: string | null = null,
): NextResponse {
  const contentType = upstream.headers.get('content-type') ?? 'application/json';
  const result = new NextResponse(body, {
    status: upstream.status,
    headers: { 'Content-Type': contentType },
  });
  if (tokens) {
    result.cookies.set(ACCESS_COOKIE, tokens.accessToken, { ...cookieOptions, maxAge: ACCESS_MAX_AGE });
    result.cookies.set(REFRESH_COOKIE, tokens.refreshToken, { ...cookieOptions, maxAge: REFRESH_MAX_AGE });
  }
  if (mfaToken) {
    result.cookies.set(MFA_COOKIE, mfaToken, { ...cookieOptions, maxAge: MFA_MAX_AGE });
  }
  return result;
}

/** Splits the tokens out of a JSON body. */
function splitTokens(text: string, contentType: string): {
  body: string;
  tokens: TokenPair | null;
  mfaToken: string | null;
} {
  if (!contentType.includes('application/json') || !text) {
    return { body: text, tokens: null, mfaToken: null };
  }
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;

    // A sign-in that stops at the second factor carries a challenge token.
    // It is a bearer token, so it is kept here and not in the page.
    const mfaToken = typeof parsed.mfaToken === 'string' ? parsed.mfaToken : null;
    if (mfaToken) delete parsed.mfaToken;

    if (typeof parsed.accessToken !== 'string' || typeof parsed.refreshToken !== 'string') {
      return { body: JSON.stringify(parsed), tokens: null, mfaToken };
    }
    const tokens = { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
    delete parsed.accessToken;
    delete parsed.refreshToken;
    return { body: JSON.stringify(parsed), tokens, mfaToken };
  } catch {
    return { body: text, tokens: null, mfaToken: null };
  }
}

async function handler(request: NextRequest, path: string[]): Promise<NextResponse> {
  const raw = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
  const body = raw && raw.length > 0 ? raw : undefined;

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  // A challenge needs the token that says the password was right. It is in a
  // cookie, so it is attached here rather than in the page.
  let outgoing = body;
  if (path[0] === 'auth' && path[1] === 'mfa' && path[2] === 'challenge') {
    const mfaToken = request.cookies.get(MFA_COOKIE)?.value;
    if (mfaToken) {
      outgoing = JSON.stringify({ ...(body ? (JSON.parse(body) as object) : {}), mfaToken });
    }
  }

  let upstream = await callApi(path, request, access, outgoing);

  // The access token expired: spend the refresh token once, and try again.
  if (upstream.status === 401 && refreshToken) {
    const renewed = await refresh(refreshToken);
    if (!renewed) {
      const result = NextResponse.json(
        { message: 'Your session has ended. Sign in again.' },
        { status: 401 },
      );
      result.cookies.delete(ACCESS_COOKIE);
      result.cookies.delete(REFRESH_COOKIE);
      return result;
    }
    upstream = await callApi(path, request, renewed.accessToken, outgoing);
    const text = await upstream.text();
    return toResponse(upstream, text, { ...renewed });
  }

  const text = await upstream.text();
  const contentType = upstream.headers.get('content-type') ?? 'application/json';
  const split = splitTokens(text, contentType);
  return toResponse(upstream, split.body, split.tokens, split.mfaToken);
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: Context) {
  return handler(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: Context) {
  return handler(request, (await context.params).path);
}

export async function PATCH(request: NextRequest, context: Context) {
  return handler(request, (await context.params).path);
}

export async function PUT(request: NextRequest, context: Context) {
  return handler(request, (await context.params).path);
}

export async function DELETE(request: NextRequest, context: Context) {
  return handler(request, (await context.params).path);
}
