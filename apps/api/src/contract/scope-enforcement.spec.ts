import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AppModule } from '@/app.module';
import { SCOPES_KEY } from '@/modules/auth/decorators/require-scope.decorator';
import { ScopeGuard } from '@/modules/auth/guards/scope-guard';

/**
 * A scope that is not enforced is worse than no scope at all.
 *
 * `@RequireScope('envvars:read')` on a route says "a key without this
 * scope may not do this". The promise is kept by `ScopeGuard` — and the
 * guard only runs if the route's controller applies it. A controller that
 * applies it on **one** route and declares scopes on **another** is the
 * shape this test exists to catch: the declaration is there, and nothing
 * reads it.
 */
describe('the scopes are enforced', () => {
  /** Every route of the platform, with the guards that run for it. */
  function routesWithScopes(): Array<{ route: string; scopes: string[]; guards: unknown[] }> {
    const found: Array<{ route: string; scopes: string[]; guards: unknown[] }> = [];

    const walk = (moduleClass: Function, seen = new Set<Function>()) => {
      if (!moduleClass || seen.has(moduleClass)) return;
      seen.add(moduleClass);

      const controllers = (Reflect.getMetadata('controllers', moduleClass) ?? []) as Function[];
      for (const controller of controllers) {
        const classGuards = (Reflect.getMetadata(GUARDS_METADATA, controller) ?? []) as unknown[];
        const classScopes = (Reflect.getMetadata(SCOPES_KEY, controller) ?? []) as string[];
        const controllerPath = (Reflect.getMetadata('path', controller) ?? '') as string;

        for (const name of Object.getOwnPropertyNames(controller.prototype)) {
          if (name === 'constructor') continue;
          const handler = controller.prototype[name];
          if (typeof handler !== 'function') continue;
          if (Reflect.getMetadata('method', handler) === undefined) continue;

          const methodGuards = (Reflect.getMetadata(GUARDS_METADATA, handler) ?? []) as unknown[];
          const methodScopes = (Reflect.getMetadata(SCOPES_KEY, handler) ?? []) as string[];
          const scopes = [...classScopes, ...methodScopes];
          if (scopes.length === 0) continue;

          found.push({
            route: `${controllerPath}${Reflect.getMetadata('path', handler) ?? ''}`,
            scopes,
            guards: [...classGuards, ...methodGuards],
          });
        }
      }

      const imports = (Reflect.getMetadata('imports', moduleClass) ?? []) as Function[];
      for (const imported of imports) walk(imported, seen);
    };

    walk(AppModule);
    return found;
  }

  it('finds the routes that declare a scope', () => {
    expect(routesWithScopes().length).toBeGreaterThan(20);
  });

  it('every route that declares a scope has the guard that enforces it', () => {
    const unguarded = routesWithScopes()
      .filter((route) => !route.guards.includes(ScopeGuard))
      .map((route) => `${route.route} — ${route.scopes.join(', ')}`);

    expect(unguarded).toEqual([]);
  });
});
