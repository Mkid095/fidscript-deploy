import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
}

/**
 * The catalogue of applications on this platform, and which are installed.
 *
 * "Installed" means what the installer recorded — the add-on is listed in the
 * installer's `FIDScript_ADDONS`. That is the same record the installer's
 * own commands use, so the screen and the installer never disagree.
 */
@Injectable()
export class ApplicationCatalogueService {
  private readonly logger = new Logger(ApplicationCatalogueService.name);

  constructor(private configService: ConfigService) {}

  /** Every application, installed or not. */
  list(): Application[] {
    const manifests = readAddonManifests();
    const installed = this.installedAddons();
    const applications: Application[] = [];

    for (const [id, presentation] of Object.entries(CORE_APPLICATIONS)) {
      applications.push({
        id,
        title: this.coreTitle(id),
        summary: this.coreSummary(id),
        kind: 'core',
        installed: true,
        installable: false,
        url: this.resolveUrl(presentation),
        requires: [],
        icon: presentation.icon,
      });
    }

    for (const manifest of manifests) {
      const presentation = ADDON_APPLICATIONS[manifest.id];
      applications.push({
        id: manifest.id,
        title: manifest.title,
        summary: manifest.summary,
        kind: 'add-on',
        installed: installed.has(manifest.id),
        installable: presentation?.installable ?? true,
        url: presentation ? this.resolveUrl(presentation) : null,
        requires: manifest.requires,
        icon: presentation?.icon ?? 'cube',
      });
    }

    return applications;
  }

  /** One application, or null when there is no such thing. */
  get(id: string): Application | null {
    return this.list().find((a) => a.id === id) ?? null;
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

  /** Where an application's console is, resolved against this platform. */
  private resolveUrl(presentation: ApplicationPresentation): string | null {
    const domain = this.configService.get<string>('PLATFORM_DOMAIN', '');
    const ip = this.configService.get<string>('SERVER_IP', '');

    if (presentation.port) {
      const host = ip || domain;
      return host ? `http://${host}:${presentation.port}` : null;
    }
    if (!presentation.host) {
      // The dashboard itself — no external URL.
      return null;
    }
    if (!domain) return null;
    return `https://${presentation.host}.${domain}${presentation.path ?? ''}`;
  }

  private coreTitle(id: string): string {
    return id === 'deployment' ? 'Deployments' : 'Email';
  }

  private coreSummary(id: string): string {
    return id === 'deployment'
      ? 'Build and run your applications on this server — a git push is the whole deploy.'
      : 'Send and receive mail on your own domain, with deliverability, aliases and inbound.';
  }
}
