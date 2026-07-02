import { NextRequest, NextResponse } from 'next/server';

/**
 * Cloudflare OAuth callback handler.
 * Cloudflare redirects here after the user authorizes.
 * This page exchanges the code for a token and sends it to the opener via postMessage.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const projectId = searchParams.get('project_id');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Connecting to Cloudflare...</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f1117; color: #e2e8f0; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #1a1f2e; border: 1px solid #2d3548; border-radius: 12px; padding: 32px; text-align: center; max-width: 400px; }
    .spinner { width: 32px; height: 32px; border: 3px solid #2d3548; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { font-size: 18px; margin: 0 0 8px; }
    p { color: #94a3b8; font-size: 14px; margin: 0; }
    .error { color: #f87171; margin-top: 12px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Connecting to Cloudflare</h2>
    <p>Completing authorization, please wait...</p>
    <p id="error" class="error" style="display:none"></p>
  </div>
  <script>
    (async function() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const projectId = params.get('project_id');

      if (!code || !state) {
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = 'Missing authorization code. Please try again.';
        return;
      }

      try {
        // POST the code to our API to complete the OAuth flow
        const res = await fetch('/api/v1/domains/connect-cloudflare/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state, projectId }),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.message || 'Connection failed');

        // Send success to opener
        if (window.opener) {
          window.opener.postMessage({ type: 'cloudflare-oauth-callback', success: true, connection: data.connection }, window.location.origin);
        }
        window.close();
      } catch (err) {
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = err.message || 'Failed to connect. Please try again.';
        if (window.opener) {
          window.opener.postMessage({ type: 'cloudflare-oauth-callback', success: false, error: err.message }, window.location.origin);
        }
      }
    })();
  </script>
</body>
</html>
`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
    status: 200,
  });
}
