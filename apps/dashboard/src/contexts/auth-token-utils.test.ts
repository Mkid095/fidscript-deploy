import { describe, it, expect } from 'vitest';
import { safeNextRoute } from './auth-token-utils.ts';

/**
 * The login's `next` parameter.
 *
 * The login sends the person wherever `next` says. If that is not checked,
 * a link like `https://fidscript.com/login?next=https://elsewhere.example`
 * turns the platform's own login into a convincing front door for somebody
 * else's site.
 */

describe('the login\'s next parameter', () => {
  it('accepts a path inside the platform', () => {
    expect(safeNextRoute('/applications')).toBe('/applications');
    expect(safeNextRoute('/projects/kennedy-test/deployments')).toBe('/projects/kennedy-test/deployments');
  });

  it('refuses another site', () => {
    expect(safeNextRoute('https://elsewhere.example')).toBeNull();
    expect(safeNextRoute('http://elsewhere.example/app')).toBeNull();
    expect(safeNextRoute('javascript:alert(1)')).toBeNull();
    expect(safeNextRoute('mailto:someone@example.com')).toBeNull();
  });

  it('refuses a protocol-relative address', () => {
    expect(safeNextRoute('//elsewhere.example')).toBeNull();
    expect(safeNextRoute('/\\elsewhere.example')).toBeNull();
  });

  it('refuses a backslash — a browser reads it as a slash', () => {
    expect(safeNextRoute('/applications\\..\\..\\elsewhere.example')).toBeNull();
  });

  it('refuses nothing at all', () => {
    expect(safeNextRoute(null)).toBeNull();
    expect(safeNextRoute(undefined)).toBeNull();
    expect(safeNextRoute('')).toBeNull();
  });
});
