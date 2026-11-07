import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShellRunnerService } from '@/modules/deployments/runner/shell-runner.service';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  ADDON_APPLICATIONS,
  CORE_APPLICATIONS,
  type ApplicationPresentation,
} from '../applications.catalog';
import {
  DOCKER_DIR,
  readAddonManifests,
  type AddonManifest,
} from '../application-manifest.reader';
import { ApplicationRuntimeService } from './application-runtime.service';
import {
  coreSummary,
  coreTitle,
  resolveApiHost,
  resolveMcp,
  resolveUrl,
} from '../application-urls';

/** An application, as the operator sees it. */
export interface Application {
  id: string;
  title: string;
  summary: string;
  /** Whether it is part of the core or an add-on the operator can install. */
  kind: 'core' | 'add-on';
  /** Whether it is installed on this platform. */
  installed: boolean;
  /** Whether the operator can install it from this screen. */
  installable: boolean;
  /** Where its console is, or null when it has none. */
  url: string | null;
  /** What the operator has to install before this one can be installed. */
  requires: string[];
  /** The icon the dashboard draws. */
  icon: string;
  /** The application's own API host, when it speaks one over HTTP. */
  apiHost: string | null;
  /** The application's own MCP server, when it has one. */
  mcp: { package: string; env: Record<string, string> } | null;
}

/**
 * The catalogue of applications on this platform, and which are installed.
 *
 * "Installed" means the installer recorded the add-on, or one of the
 * application's containers is running.
 */
@Injectable()
export class ApplicationCatalogueService {
  private readonly logger = new Logger(ApplicationCatalogueService.name);

  constructor(
    private configService: ConfigService,
    private runtime: ApplicationRuntimeService,
  ) {}

  /** Every application, installed or not. */
  async list(): Promise<Application[]> {
    const manifests = readAddonManifests();
    const installed = this.installedAddons();
    const running = await this.runtime.runningContainers();
    const domain = this.configService.get<string>('PLATFORM_DOMAIN', '');
    const ip = this.configService.get<string>('SERVER_IP', '');
    const applications: Application[] = [];

    for (const [id, presentation] of Object.entries(CORE_APPLICATIONS)) {
      applications.push({
        id,
        title: coreTitle(id),
        summary: coreSummary(id),
        kind: 'core',
        installed: true,
        installable: false,
        url: resolveUrl(presentation, domain, ip),
        requires: [],
        icon: presentation.icon,
        apiHost: resolveApiHost(presentation, domain),
        mcp: resolveMcp(presentation, domain),
      });
    }

    for (const manifest of manifests) {
      const presentation = ADDON_APPLICATIONS[manifest.id];
      applications.push({
        id: manifest.id,
        title: manifest.title,
        summary: manifest.summary,
        kind: 'add-on',
        installed: installed.has(manifest.id) || this.runtime.isRunning(manifest.id, running),
        installable: presentation?.installable ?? true,
        url: presentation ? resolveUrl(presentation, domain, ip) : null,
        requires: manifest.requires,
        icon: presentation?.icon ?? 'cube',
        apiHost: presentation ? resolveApiHost(presentation, domain) : null,
        mcp: presentation ? resolveMcp(presentation, domain) : null,
      });
    }

    return applications;
  }

  /** One application, or null when there is no such thing. */
  async get(id: string): Promise<Application | null> {
    return (await this.list()).find((a) => a.id === id) ?? null;
  }

  /**
   * The add-ons the installer has recorded as enabled.
   *
   * The file is the installer's own record — the same one `fidscript-addons`
   * reads and writes — so the screen and the installer cannot disagree.
   */
  installedAddons(): Set<string> {
    const file = join(DOCKER_DIR, '.env');
    if (!existsSync(file)) return new Set();
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch (err) {
      this.logger.warn(
        `[applications] Could not read ${file}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return new Set();
    }
    const line = text.split('\n').find((l) => l.startsWith('FIDScript_ADDONS='));
    if (!line) return new Set();
    return new Set(
      line
        .split('=')
        .slice(1)
        .join('=')
        .replace(/"/g, '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    );
  }
}
