import * as path from 'path';
import { AppModule } from '@/app.module';
import { API_PREFIX } from '@/common/api-prefix';
import { routesOfModule, pathMatches, type ApiRoute } from '@/contract/api-route-table';
import { scanSdkCalls } from '@/contract/sdk-path-scanner';

/**
 * The contract between the API and the SDK.
 *
 * The SDK is the platform's own client: every method it exposes is a call
 * to an API route. When the two disagree the disagreement is **silent** — the
 * request 404s and the screen renders empty — which is how the email
 * console came to show no domains at all, and how ten of the SDK's paths
 * were quietly wrong.
 *
 * This test reads the API's routes from the controllers themselves and the
 * SDK's calls from its source, and asserts that every one of them lands on
 * a route that exists.
 */

const SDK_ROOT = path.resolve(__dirname, '../../../../packages/sdk/src');

/** The API's routes, without the global prefix. */
function apiRoutes(): ApiRoute[] {
  const prefix = `/${API_PREFIX}`;
  return routesOfModule(AppModule).map((r) => ({
    ...r,
    path: r.path.startsWith(prefix) ? r.path.slice(prefix.length) || '/' : r.path,
  }));
}

/** Whether the SDK's path lands on one of the API's routes. */
function landsOnRoute(call: { method: string; path: string }, routes: ApiRoute[]): boolean {
  return routes.some((route) => route.method === call.method && pathMatches(route.path, call.path));
}

describe('the API and the SDK agree', () => {
  const routes = apiRoutes();
  const { calls } = scanSdkCalls(SDK_ROOT);

  it('the API has routes to check against', () => {
    expect(routes.length).toBeGreaterThan(100);
  });

  it('every path the SDK calls is a route the API serves', () => {
    const unmatched = calls
      .filter((call) => !landsOnRoute(call, routes))
      .map((call) => `${call.method} ${call.path} — ${call.file}:${call.line}`);

    expect(unmatched).toEqual([]);
  });

  /**
   * The environment variables carry their scopes.
   *
   * The route had none, so a project key read the project's variable
   * **names** whatever its scopes were: the values stayed masked, but the
   * names are the half that says what to go and look for. The scope
   * vocabulary already had `envvars:read` and `envvars:write` — they had
   * never been used.
   */
  it('the environment variables ask for a scope', () => {
    const scopeOf = (method: string, path: string) =>
      routes.find((r) => r.method === method && r.path === path)?.scopes ?? [];

    expect(scopeOf('GET', '/projects/:id/env-vars')).toContain('envvars:read');
    expect(scopeOf('PUT', '/projects/:id/env-vars')).toContain('envvars:write');
    expect(scopeOf('DELETE', '/projects/:id/env-vars/:key')).toContain('envvars:write');
  });
});
