import { NextRequest, NextResponse } from 'next/server';

/**
 * GitHub OAuth callback bridge for the dashboard.
 *
 * The backend (`apps/api/.../user-github.controller.ts`) already exposes
 * `GET /users/me/github/callback` which renders a postMessage script and
 * closes the popup. This Next.js route is the dashboard-side equivalent for
 * the (rare) case where the GitHub redirect lands in the main window instead
 * of a popup — it postMessages the code to any open dashboard window so the
 * normal "Connect GitHub" flow can complete via `sdk.github.exchange(code)`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code') ?? '';
  const state = searchParams.get('state') ?? '';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description') ?? '';
  const status = error ? 'error' : 'success';
  const message = error ?? 'Authorization complete. You can close this window.';

  const payload = JSON.stringify({
    type: 'github-oauth-callback',
    status,
    code, state, error, errorDescription,
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>GitHub authorization</title>
  <style>
    body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #0b0d12; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; }
    .card { background: #131722; border: 1px solid #232a3b; border-radius: 12px; padding: 32px; max-width: 420px; text-align: center; }
    h1 { font-size: 18px; margin: 12px 0 6px; }
    p { color: #94a3b8; font-size: 14px; margin: 0; }
    .err { color: #f87171; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${error ? 'GitHub authorization failed' : 'GitHub connected'}</h1>
    <p class="${error ? 'err' : ''}">${message}</p>
    <p style="margin-top:16px;font-size:12px;color:#64748b">You can close this window and return to the dashboard.</p>
  </div>
  <script>
    (function() {
      var payload = ${payload};
      try {
        if (window.opener) {
          window.opener.postMessage(payload, window.location.origin);
          setTimeout(function() { window.close(); }, 250);
        }
      } catch (e) { /* no opener - user opened callback in main tab */ }
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    status: 200,
  });
}
