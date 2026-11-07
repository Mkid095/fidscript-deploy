import type { IntegrationTier } from '@/testing/integration';

/**
 * The calls the auth suites make.
 *
 * One place, so both files ask the platform the same way.
 */
export async function post(
  tier: IntegrationTier,
  path: string,
  body: unknown,
  token?: string,
) {
  const response = await fetch(`${tier.url}/api/v1${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: response.status, json: json as any };
}
