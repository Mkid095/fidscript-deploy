/**
 * The API's route table, read from the controllers themselves.
 *
 * Every controller declares its path with `@Controller('...')` and each of its
 * routes with `@Get()`, `@Post()` and so on. Nest stores both in metadata, so
 * the table can be read without booting the application — no database, no
 * NATS, no Redis. That matters: a contract test must be runnable anywhere.
 */
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { SCOPES_KEY } from '@/modules/auth/decorators/require-scope.decorator';

/** One route the API serves. */
export interface ApiRoute {
  method: string;
  /** The full path, with the global prefix: `/api/v1/projects/:projectId`. */
  path: string;
  /** The scopes the route asks an API key for. */
  scopes: string[];
}

const HTTP_METHODS: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.PATCH]: 'PATCH',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.OPTIONS]: 'OPTIONS',
  [RequestMethod.HEAD]: 'HEAD',
  [RequestMethod.ALL]: 'ALL',
};

/**
 * Read the routes of a controller class.
 *
 * The controller's own path is the class metadata; a method's path is the
 * method metadata. A method with no path of its own answers on the
 * controller's path — which is how Nest treats `@Get()` on a controller
 * declared as `@Controller('things')`.
 */
export function routesOf(controller: Function): ApiRoute[] {
  const controllerPath = Reflect.getMetadata(PATH_METADATA, controller) ?? '';
  const routes: ApiRoute[] = [];

  for (const name of Object.getOwnPropertyNames(controller.prototype)) {
    if (name === 'constructor') continue;
    const handler = controller.prototype[name];
    if (typeof handler !== 'function') continue;

    const method = Reflect.getMetadata(METHOD_METADATA, handler);
    if (method === undefined) continue;

    const methodPath = Reflect.getMetadata(PATH_METADATA, handler) ?? '';
    const scopes = (Reflect.getMetadata(SCOPES_KEY, handler) ?? []) as string[];
    routes.push({
      method: HTTP_METHODS[method] ?? String(method),
      path: joinPaths(controllerPath, methodPath),
      scopes,
    });
  }

  return routes;
}

/** Join a controller's path with a method's path. */
export function joinPaths(controllerPath: string, methodPath: string): string {
  const parts = [controllerPath, methodPath]
    .map((p) => p.replace(/^\/+|\/+$/g, ''))
    .filter((p) => p.length > 0);
  return '/' + parts.join('/');
}

/**
 * Read the routes of every controller the platform serves.
 *
 * A module declares its own controllers in metadata, and the modules it
 * imports in metadata too — so the whole tree is walked, and every
 * controller in it is read.
 */
export function routesOfModule(moduleClass: Function): ApiRoute[] {
  const seen = new Set<Function>();
  const routes: ApiRoute[] = [];

  const walk = (module: Function) => {
    if (!module || seen.has(module)) return;
    seen.add(module);
    const controllers = (Reflect.getMetadata('controllers', module) ?? []) as Function[];
    for (const controller of controllers) routes.push(...routesOf(controller));
    const imports = (Reflect.getMetadata('imports', module) ?? []) as Function[];
    for (const imported of imports) walk(imported);
  };

  walk(moduleClass);
  return routes;
}

/** Whether two paths address the same route (`:id` matches any segment). */
export function pathMatches(route: string, actual: string): boolean {
  const a = route.split('/').filter(Boolean);
  const b = actual.split('/').filter(Boolean);
  if (a.length !== b.length) return false;
  return a.every((segment, i) => segment.startsWith(':') || segment === b[i]);
}
