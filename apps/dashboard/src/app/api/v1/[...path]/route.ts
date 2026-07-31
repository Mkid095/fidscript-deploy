import { NextResponse } from 'next/server';

const API_BASE = 'http://api:3001/api/v1';
const ALLOWED_ORIGIN = 'https://deploy.fidscript.com';

function proxyHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, value] of request.headers.entries()) {
    if (!['content-length', 'host', 'connection'].includes(key.toLowerCase())) {
      headers[key] = value;
    }
  }
  return headers;
}

function responseHeaders(contentType: string | null) {
  return {
    'Content-Type': contentType ?? 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = new URL(request.url);
  const query = url.search || '';
  try {
    const res = await fetch(`${API_BASE}/${path.join('/')}${query}`, {
      headers: proxyHeaders(request),
    });
    const text = await res.text();
    return new Response(text, { status: res.status, headers: responseHeaders(res.headers.get('Content-Type')) });
  } catch {
    return Response.json({ message: 'Proxy error' }, { status: 502 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const body = await request.text();
  try {
    const res = await fetch(`${API_BASE}/${path.join('/')}`, {
      method: 'POST',
      headers: { ...proxyHeaders(request), 'Content-Type': 'application/json' },
      body,
    });
    const text = await res.text();
    return new Response(text, { status: res.status, headers: responseHeaders(res.headers.get('Content-Type')) });
  } catch {
    return Response.json({ message: 'Proxy error' }, { status: 502 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const body = await request.text();
  try {
    const res = await fetch(`${API_BASE}/${path.join('/')}`, {
      method: 'PUT',
      headers: { ...proxyHeaders(request), 'Content-Type': 'application/json' },
      body,
    });
    const text = await res.text();
    return new Response(text, { status: res.status, headers: responseHeaders(res.headers.get('Content-Type')) });
  } catch {
    return Response.json({ message: 'Proxy error' }, { status: 502 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const body = await request.text();
  try {
    const res = await fetch(`${API_BASE}/${path.join('/')}`, {
      method: 'PATCH',
      headers: { ...proxyHeaders(request), 'Content-Type': 'application/json' },
      body,
    });
    const text = await res.text();
    return new Response(text, { status: res.status, headers: responseHeaders(res.headers.get('Content-Type')) });
  } catch {
    return Response.json({ message: 'Proxy error' }, { status: 502 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = new URL(request.url);
  const query = url.search || '';
  try {
    const res = await fetch(`${API_BASE}/${path.join('/')}${query}`, {
      method: 'DELETE',
      headers: proxyHeaders(request),
    });
    const text = await res.text();
    return new Response(text, { status: res.status, headers: responseHeaders(res.headers.get('Content-Type')) });
  } catch {
    return Response.json({ message: 'Proxy error' }, { status: 502 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
