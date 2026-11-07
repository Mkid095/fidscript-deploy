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
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/console/api/')) {
    return NextResponse.next();
  }

  const headers = new Headers(request.headers);
  headers.set('x-pathname', request.nextUrl.pathname + request.nextUrl.search);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.svg$).*)'],
};
