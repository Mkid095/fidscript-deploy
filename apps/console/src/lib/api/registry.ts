import 'server-only';

import { serverApi as api } from './server';

/** One registry scope, as the platform keeps it. */
export interface RegistryScope {
  /** The npm scope, e.g. `@soostori`. */
  scope: string;
  /** Whether the scope's packages are readable without a token. */
  anonymousRead: boolean;
  /** Whether the registry holds packages under the scope. */
  published: boolean;
}

/** The registry's scopes, and which of them answer without a token. */
export async function registryScopes(): Promise<RegistryScope[]> {
  const response = await api.get<{ scopes: RegistryScope[] }>(
    '/applications/package-manager/scopes',
  );
  return response.scopes;
}
