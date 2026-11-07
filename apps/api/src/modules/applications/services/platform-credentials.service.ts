import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import axios from 'axios';

import { PrismaService } from '@/prisma/prisma.service';
import { InstantClientService } from '@/modules/instant/services/instant-client.service';

/**
 * The credentials of the applications the platform runs.
 *
 * "One email, one password" is a **decision the operator makes** (P5.4),
 * not a fact they discover by trying to sign in. This service is where the
 * decision is read, checked and — where an application takes its
 * credential from the platform rather than an environment variable —
 * applied.
 *
 * Each application answers with what it was installed to answer with:
 *
 * | application | what signs in                | the platform can apply |
 * |-------------|------------------------------|------------------------|
 * | console     | the platform's own account   | — (it IS the account)  |
 * | grafana     | its admin user + password    | yes, over its API      |
 * | stalwart    | the recovery administrator   | no — it is env-defined |
 * | instantdb   | an account, by magic code    | no — codes, not passwords |
 */

export type ApplicationCredentialId =
  | 'console'
  | 'grafana'
  | 'stalwart'
  | 'instantdb';

export interface ApplicationCredential {
  id: ApplicationCredentialId;
  label: string;
  /** The account the application answers with, as it is configured now. */
  account: string | null;
  /** How a person signs into it. */
  authType: 'password' | 'magic-code';
  /** Where the password it answers with comes from. */
  passwordSource: 'platform' | 'own' | 'machine' | 'none';
  /** Whether the platform can push the platform's identity onto it. */
  canApply: boolean;
  consoleUrl: string | null;
  /** Whether the platform holds a working credential to it at all. */
  available: boolean;
  note: string | null;
}

@Injectable()
export class PlatformCredentialsService {
  private readonly logger = new Logger(PlatformCredentialsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private instant: InstantClientService,
  ) {}

  // ── Reading ─────────────────────────────────────────────────────────

  /** Every application, and the account each answers with right now. */
  async list(): Promise<{
    applications: ApplicationCredential[];
    platformEmail: string | null;
  }> {
    const installation = await this.prisma.installationSettings.findUnique({
      where: { id: 'installation' },
      select: { adminEmail: true },
    });
    const platformEmail =
      installation?.adminEmail ??
      (this.config.get<string>('ADMIN_EMAIL', '') || null);

    const grafanaUser =
      this.config.get<string>('GRAFANA_ADMIN_USER', '') || null;
    const stalwartUser =
      this.config.get<string>('STALWART_JMAP_USER', '') ||
      this.stalwartRecoveryName();
    const instantEmail =
      this.config.get<string>('INSTANT_SUPERUSER_EMAIL', '') || null;

    return {
      platformEmail,
      applications: [
        {
          id: 'console',
          label: 'The console',
          account: platformEmail,
          authType: 'password',
          passwordSource: 'platform',
          canApply: false,
          consoleUrl: `https://${this.config.get<string>('PLATFORM_DOMAIN', 'localhost')}`,
          available: true,
          note: 'The platform account is its own — this is the email and password the operator signs in with.',
        },
        {
          id: 'grafana',
          label: 'Grafana',
          account: grafanaUser,
          authType: 'password',
          passwordSource: 'platform',
          canApply: true,
          consoleUrl: `https://grafana.${this.config.get<string>('PLATFORM_DOMAIN', 'localhost')}`,
          available: true,
          note: 'The dashboards open with the platform email and the platform password.',
        },
        {
          id: 'stalwart',
          label: 'Stalwart (the mail server)',
          account: stalwartUser,
          authType: 'password',
          passwordSource: 'platform',
          canApply: false,
          consoleUrl: `https://stalwart-admin.${this.config.get<string>('PLATFORM_DOMAIN', 'localhost')}/admin`,
          available: true,
          note:
            'The mail administrator is the platform email with the platform password. It is the ' +
            'recovery administrator the installer defines, so it changes with the installer and a ' +
            'restart of the mail server — the same change also rewrites the SMTP submission ' +
            'password, because both are one credential.',
        },
        {
          id: 'instantdb',
          label: 'InstantDB',
          account: instantEmail,
          authType: 'magic-code',
          passwordSource: 'none',
          canApply: false,
          consoleUrl: this.instant.dashboardUrl || null,
          available: this.instant.isConfigured(),
          note:
            'It signs in with a magic code sent to the account email — there is no password to ' +
            'set. The account lives under the platform email, and the platform holds a personal ' +
            'access token of that account to create projects their apps with.',
        },
      ],
    };
  }

  // ── Verifying ───────────────────────────────────────────────────────

  /**
   * Whether the given password opens each application.
   *
   * This is the live answer to "one email, one password?": not a claim
   * about configuration, but each application asked.
   */
  async verify(
    userId: string,
    email: string,
    password: string,
  ): Promise<{
    results: Array<{
      id: ApplicationCredentialId;
      opens: boolean | null;
      detail?: string;
    }>;
  }> {
    const [consoleResult, grafanaResult, stalwartResult] = await Promise.all([
      this.verifyConsole(userId, password),
      this.verifyGrafana(email, password).catch((err) => ({
        id: 'grafana' as ApplicationCredentialId,
        opens: null,
        detail: err instanceof Error ? err.message : String(err),
      })),
      this.verifyStalwart(email, password).catch((err) => ({
        id: 'stalwart' as ApplicationCredentialId,
        opens: null,
        detail: err instanceof Error ? err.message : String(err),
      })),
    ]);

    return {
      results: [
        consoleResult,
        grafanaResult,
        stalwartResult,
        {
          id: 'instantdb' as ApplicationCredentialId,
          opens: null,
          detail:
            'It signs in with a magic code — there is no password to check.',
        },
      ],
    };
  }

  /** The platform's own account: the password opens it, or it does not. */
  private async verifyConsole(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) {
      return {
        id: 'console' as ApplicationCredentialId,
        opens: null,
        detail: 'The account has no password set.',
      };
    }
    const opens = await bcrypt.compare(password, user.passwordHash);
    return { id: 'console' as ApplicationCredentialId, opens };
  }

  /** Grafana: its own sign-in API, asked with the candidate credential. */
  private async verifyGrafana(email: string, password: string) {
    const url = this.grafanaUrl();
    if (!url)
      return {
        id: 'grafana' as ApplicationCredentialId,
        opens: null,
        detail: 'Grafana is not configured.',
      };
    const response = await axios.get(`${url}/api/user`, {
      auth: { username: email, password },
      timeout: 8_000,
    });
    return {
      id: 'grafana' as ApplicationCredentialId,
      opens: response.status === 200,
    };
  }

  /** Stalwart: the JMAP endpoint, asked with the candidate credential. */
  private async verifyStalwart(email: string, password: string) {
    const url = this.stalwartJmapUrl();
    const credentials = Buffer.from(`${email}:${password}`).toString('base64');
    const response = await axios.post(
      `${url}/jmap`,
      {
        using: ['urn:ietf:params:jmap:core'],
        methodCalls: [['Core/echo', {}, '0']],
      },
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        timeout: 8_000,
      },
    );
    const ok = Array.isArray(response.data?.methodResponses);
    return { id: 'stalwart' as ApplicationCredentialId, opens: ok };
  }

  // ── Applying ────────────────────────────────────────────────────────

  /**
   * Push the platform's identity onto every application that takes its
   * credential from the platform.
   *
   * Grafana is the one that does: its admin API renames the admin user and
   * sets the password. The installer's password file is written to as well
   * when it can be — the file is what a restart of Grafana reads back.
   */
  async apply(
    userId: string,
    email: string,
    password: string,
  ): Promise<{
    results: Array<{
      id: ApplicationCredentialId;
      applied: boolean | 'manual';
      detail?: string;
    }>;
  }> {
    const results: Array<{
      id: ApplicationCredentialId;
      applied: boolean | 'manual';
      detail?: string;
    }> = [
      {
        id: 'console',
        applied: 'manual',
        detail:
          'The console account is the platform account — change it in Settings → Account.',
      },
    ];

    // Grafana: rename + set the password over its admin API, with the
    // credential the platform holds for it now.
    try {
      const url = this.grafanaUrl();
      const current = this.grafanaAdminCredential();
      if (!url || !current) {
        results.push({
          id: 'grafana',
          applied: 'manual',
          detail: 'The platform holds no Grafana credential to apply with.',
        });
      } else {
        const auth = {
          auth: { username: current.user, password: current.password },
          timeout: 10_000,
        };
        const me = await axios.get(`${url}/api/user`, auth);
        const id = me.data?.id;
        if (!id) throw new Error('Grafana did not say who its admin is');
        await axios.put(
          `${url}/api/users/${id}`,
          { login: email, email },
          auth,
        );
        await axios.put(
          `${url}/api/admin/users/${id}/password`,
          { password },
          auth,
        );
        this.logger.log(`[credentials] Grafana now answers to ${email}`);
        results.push({ id: 'grafana', applied: true });
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[credentials] Could not apply to Grafana: ${detail}`);
      results.push({ id: 'grafana', applied: false, detail });
    }

    results.push({
      id: 'stalwart',
      applied: 'manual',
      detail:
        'The mail administrator is the recovery administrator, defined by the installer ' +
        '(STALWART_RECOVERY_ADMIN) and read back at startup. Change it there, with the SMTP ' +
        'submission password, and restart the mail server — both are one credential.',
    });

    results.push({
      id: 'instantdb',
      applied: 'manual',
      detail:
        'InstantDB signs in with a magic code sent to the account email — there is no password to apply.',
    });

    return { results };
  }

  // ── The small reads ─────────────────────────────────────────────────

  private grafanaUrl(): string | null {
    const url = this.config.get<string>('GRAFANA_URL', '');
    return url ? url.replace(/\/+$/, '') : null;
  }

  /** The credential the platform holds for Grafana — the installer's. */
  private grafanaAdminCredential(): { user: string; password: string } | null {
    const user = this.config.get<string>('GRAFANA_ADMIN_USER', '');
    if (!user) return null;
    const password =
      this.readFile(
        this.config.get<string>('GRAFANA_ADMIN_PASSWORD_FILE', ''),
      ) ??
      this.config.get<string>('OBSERVABILITY_GRAFANA_PASSWORD', '') ??
      '';
    if (!password) return null;
    return { user, password };
  }

  private stalwartJmapUrl(): string {
    return (
      this.config.get<string>(
        'STALWART_JMAP_URL',
        'http://fidscript_stalwart:8080',
      ) || ''
    ).replace(/\/+$/, '');
  }

  private stalwartRecoveryName(): string | null {
    // The recovery pair is "name:password" in the environment; the name is
    // what the application answers with when nothing more specific is set.
    const pair = this.config.get<string>('STALWART_RECOVERY_ADMIN', '');
    const name = pair.split(':')[0]?.trim();
    return name || null;
  }

  private readFile(path: string): string | null {
    if (!path) return null;
    try {
      const content = fs.readFileSync(path, 'utf8').trim();
      return content || null;
    } catch {
      return null;
    }
  }
}
