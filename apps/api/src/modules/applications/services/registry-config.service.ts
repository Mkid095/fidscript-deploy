import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '@/prisma/prisma.service';
import { ShellRunnerService } from '@/modules/deployments/runner/shell-runner.service';
import { RegistryCatalogueService } from './registry-catalogue.service';

/** The registry's own container — the one that reads this config at start. */
const REGISTRY_CONTAINER = 'fidscript_npm_registry';

/** One scope's access rule, as the console shows it. */
export interface RegistryScopeRow {
  /** The npm scope, e.g. `@soostori`. */
  scope: string;
  /** Whether the scope's packages are readable without a token. */
  anonymousRead: boolean;
  /** Whether the registry currently holds packages under the scope. */
  published: boolean;
}

/**
 * The registry's per-scope access rules.
 *
 * The registry (Verdaccio) is shared: it proxies the public registry and
 * holds the platform's own packages and a customer's private scopes. A
 * scope whose packages a plain deployment must install without carrying a
 * token is opened here: its access rule goes from `$authenticated` to
 * `$all`, and the rule is written into the registry's own config so the
 * registry honours it on its next start. Publishing stays authenticated
 * either way — opening a scope lets the world read, not write.
 *
 * The config file is mounted read-only into the registry container, so the
 * api must be able to reach it: the applications directory is mounted in,
 * named by APPLICATIONS_DIR. Without it the write is refused outright —
 * a silent no-op that the next registry restart rolls back is worse than
 * an error that names the missing mount.
 */
@Injectable()
export class RegistryConfigService {
  private readonly logger = new Logger(RegistryConfigService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private shell: ShellRunnerService,
    private registry: RegistryCatalogueService,
  ) {}

  /** The registry's config file, when the api can reach it. */
  configPath(): string | undefined {
    const dir = this.config.get<string>('APPLICATIONS_DIR');
    return dir
      ? join(dir, 'package-manager', 'verdaccio', 'config.yaml')
      : undefined;
  }

  /** The stored rules, plus the scopes the registry actually holds packages under. */
  async listScopes(): Promise<RegistryScopeRow[]> {
    const rows = await this.prisma.registryScopeAccess.findMany();
    const stored = new Map(
      rows.map((row) => [row.scope, row.anonymousRead]),
    );

    // The published half comes from the registry itself — a scope that has
    // no packages yet is a stored rule only, and a registry that does not
    // answer changes nothing about the stored rules.
    const published = new Set<string>();
    const catalogue = await this.registry.catalogue();
    if (catalogue.reachable) {
      for (const pkg of catalogue.packages) {
        const [scope] = pkg.name.split('/');
        if (scope?.startsWith('@')) published.add(scope);
      }
    }

    const scopes = new Set<string>([...stored.keys(), ...published]);
    return Array.from(scopes)
      .map((scope) => ({
        scope,
        anonymousRead: stored.get(scope) ?? false,
        published: published.has(scope),
      }))
      .sort((a, b) => a.scope.localeCompare(b.scope));
  }

  /**
   * Set a scope's rule and make the registry honour it: the config is
   * rewritten and the registry restarted with it.
   */
  async setScopeAccess(
    scope: string,
    anonymousRead: boolean,
  ): Promise<{ scope: string; anonymousRead: boolean; restarted: boolean }> {
    await this.prisma.registryScopeAccess.upsert({
      where: { scope },
      create: { scope, anonymousRead },
      update: { anonymousRead },
    });
    await this.apply();
    return { scope, anonymousRead, restarted: true };
  }

  /**
   * Regenerate the registry's packages section from the stored rules and
   * restart the registry with it.
   */
  async apply(): Promise<{ configPath: string; restarted: boolean }> {
    const path = this.configPath();
    if (!path || !existsSync(path)) {
      throw new InternalServerErrorException(
        `The registry's config is not reachable from the api (${path ?? 'APPLICATIONS_DIR is not set'}). ` +
          'The api container needs the applications directory mounted — the registry keeps its old config until it is.',
      );
    }

    const rows = await this.prisma.registryScopeAccess.findMany();
    const original = readFileSync(path, 'utf-8');
    const rewritten = this.replacePackagesSection(
      original,
      this.renderPackagesSection(rows),
    );

    // Atomic: a crash mid-write must not leave the registry a config it
    // cannot parse — it would come up with no packages section at all.
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, rewritten, { mode: 0o644 });
    renameSync(tmp, path);
    this.logger.log(
      `Rewrote the registry's config (${rows.length} scope rule(s)) — restarting ${REGISTRY_CONTAINER}`,
    );

    try {
      await this.shell.runStreaming(
        `docker restart ${REGISTRY_CONTAINER}`,
        () => {},
        { timeout: 120_000 },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `The registry's config was rewritten, but the registry did not restart: ${msg}. Restart it with: docker restart ${REGISTRY_CONTAINER}`,
      );
    }
    return { configPath: path, restarted: true };
  }

  /**
   * The packages section: the platform's own scope, the stored rules, and
   * the public fallback. Each stored scope is local-only, the same as the
   * platform's — nothing is proxied upstream, so a package published under
   * it can never be shadowed by one from npmjs.org.
   */
  private renderPackagesSection(
    rows: Array<{ scope: string; anonymousRead: boolean }>,
  ): string {
    const lines: string[] = ['packages:'];
    lines.push(
      "  # The platform's own packages — public read (so `npm i` works",
      '  # without a token), authenticated publish, and local-only: nothing',
      "  # is proxied upstream, so a package published here can never be",
      '  # shadowed by one from npmjs.org.',
      "  '@fidscript-deploy/*':",
      '    access: $all',
      '    publish: $authenticated',
      '    unpublish: $authenticated',
      '',
    );
    for (const row of rows) {
      lines.push(
        row.anonymousRead
          ? `  # ${row.scope} — open read, closed write: a plain deployment installs it without a token; publishing still needs one.`
          : `  # ${row.scope} — closed: a token is needed even to read its packages.`,
        `  '${row.scope}/*':`,
        `    access: ${row.anonymousRead ? '$all' : '$authenticated'}`,
        '    publish: $authenticated',
        '    unpublish: $authenticated',
        '',
      );
    }
    lines.push(
      '  # Anything not published locally falls through to npmjs. Reading is',
      '  # open; publishing requires an authenticated user.',
      "  '**':",
      '    access: $all',
      '    publish: $authenticated',
      '    unpublish: $authenticated',
      '    proxy: npmjs',
    );
    return lines.join('\n');
  }

  /**
   * Swap the file's packages section for the rendered one. The section
   * ends at the next top-level key — the comments inside it belong to it,
   * and the rendered section carries its own.
   */
  private replacePackagesSection(yaml: string, section: string): string {
    const lines = yaml.split('\n');
    const start = lines.findIndex((line) => line.startsWith('packages:'));
    if (start === -1) {
      throw new InternalServerErrorException(
        'The registry config has no packages section — it is not the file the platform manages',
      );
    }
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^[a-zA-Z]/.test(lines[i])) {
        end = i;
        break;
      }
    }
    return [
      ...lines.slice(0, start),
      ...section.split('\n'),
      ...lines.slice(end),
    ].join('\n');
  }
}
