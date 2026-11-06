import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** One package the registry holds. */
export interface RegistryPackage {
  name: string;
  version: string;
  description?: string;
}

/** What the package manager screen needs to be useful. */
export interface RegistryCatalogue {
  /** The registry's own address — the console. */
  registryUrl: string;
  /** Where a person gets a token. */
  tokenUrl: string;
  /** The packages anyone may see. */
  packages: RegistryPackage[];
  /** Whether the registry answered. */
  reachable: boolean;
}

/**
 * The package manager — the private npm registry the platform publishes.
 *
 * The console hides the private scopes (@soostori, @nextmavens) from an
 * anonymous visitor, so the packages a page can list are only the public
 * ones; the rest are one token away, and the token page is the way to it.
 */
@Injectable()
export class RegistryCatalogueService {
  private readonly logger = new Logger(RegistryCatalogueService.name);

  constructor(private config: ConfigService) {}

  /** The registry's addresses: the console and the token page. */
  addresses(): { registryUrl: string; tokenUrl: string } {
    const domain = this.config.get<string>('PLATFORM_DOMAIN', 'deploy.fidscript.com');
    const registryUrl = `https://registry.${domain}`;
    return { registryUrl, tokenUrl: `${registryUrl}/-/static/token` };
  }

  /**
   * The registry's console, its token page and the packages anyone may see.
   *
   * A registry that does not answer is reported as unreachable rather than
   * as an empty registry: an operator must be able to tell the two apart.
   */
  async catalogue(): Promise<RegistryCatalogue> {
    const { registryUrl, tokenUrl } = this.addresses();
    try {
      const packages = await this.readPackages(registryUrl);
      return { registryUrl, tokenUrl, packages, reachable: true };
    } catch (err) {
      this.logger.warn(
        `Could not read the registry's packages: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { registryUrl, tokenUrl, packages: [], reachable: false };
    }
  }

  /** The package list the registry's console shows. */
  private async readPackages(registryUrl: string): Promise<RegistryPackage[]> {
    const response = await fetch(`${registryUrl}/-/verdaccio/data/packages`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new Error(`the registry answered ${response.status}`);
    }
    const raw = (await response.json()) as Array<{
      name?: string;
      version?: string;
      description?: string;
    }>;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((p) => typeof p.name === 'string')
      .map((p) => ({
        name: p.name as string,
        version: p.version ?? '—',
        description: p.description ?? undefined,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
