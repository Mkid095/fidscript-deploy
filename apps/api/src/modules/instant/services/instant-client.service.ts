import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { InstantApiError, instantRequest } from './instant-api.request';

/** The Instant app, as the dash API returns it. */
export interface InstantApp {
  id: string;
  title: string;
}

/**
 * The client for Instant's dashboard API (`/dash/*`).
 *
 * This is the server-to-server half of the Instant integration: the platform
 * creates an app for a project, reads it back, and deletes it. The
 * app-facing half — queries, realtime, permissions — is Instant's own SDK,
 * and is not wrapped here.
 *
 * Two credentials are involved, and they are NOT interchangeable:
 *
 * - The **personal access token** (`per_…`) belongs to an Instant *user* and
 *   is what creates apps. The platform holds one for the superuser.
 * - The **admin token** belongs to an *app* and is what manages that app's
 *   schema, permissions and files. The platform generates one per app it
 *   creates, because Instant takes it from the request body.
 */
@Injectable()
export class InstantClientService {
  constructor(private configService: ConfigService) {}

  /**
   * The base URL the platform talks to. The default is the in-network
   * address of the Instant add-on's server — on a single host that avoids
   * bouncing the request out through the edge and back.
   */
  get apiHost(): string {
    const host =
      this.configService.get<string>('INSTANT_API_HOST') ??
      'http://fidscript_instant_server:8888';
    return host.replace(/\/+$/, '');
  }

  /** The URL that browsers and deployed applications connect to. */
  get publicApiHost(): string {
    const host =
      this.configService.get<string>('INSTANT_PUBLIC_API_HOST') ?? this.apiHost;
    return host.replace(/\/+$/, '');
  }

  /** The Instant console, where the operator manages apps and permissions. */
  get dashboardUrl(): string {
    const host = this.configService.get<string>('INSTANT_DASH_HOST') ?? '';
    return host.replace(/\/+$/, '');
  }

  /**
   * The superuser's personal access token.
   *
   * It is read from a FILE when one is configured, because a token is a
   * secret and the platform's own secrets are mounted read-only rather than
   * passed through the environment.
   *
   * A file that is not there yet is NOT remembered as "no token": the
   * installer writes it after the stack is up, and the platform must pick
   * it up without being restarted.
   */
  get superuserToken(): string | null {
    const file = this.configService.get<string>('INSTANT_SUPERUSER_TOKEN_FILE');
    if (file) {
      try {
        const token = readFileSync(file, 'utf8').trim();
        if (token) return token;
      } catch {
        // The file is not there yet — the installer writes it after the
        // stack comes up. Try again on the next call.
      }
    }
    const token = this.configService.get<string>('INSTANT_SUPERUSER_TOKEN');
    return token?.trim() || null;
  }

  /** Whether the platform can create apps at all. */
  isConfigured(): boolean {
    return this.superuserToken !== null;
  }

  /**
   * Create an app.
   *
   * The app id and the admin token are supplied by the caller — Instant reads
   * both out of the request body (`server/src/instant/dash/routes.clj`,
   * `apps-post`) — so the platform ends up holding a full-privilege
   * credential for the app it just created.
   */
  async createApp(appId: string, title: string, adminToken: string): Promise<InstantApp> {
    const body = await instantRequest<{ app: { id: string; title: string } }>(
      this.apiHost,
      'POST',
      '/dash/apps',
      this.superuserToken,
      { title, id: appId, admin_token: adminToken },
    );
    return { id: body.app.id, title: body.app.title };
  }

  /** Read an app back, using the app's own admin token. */
  async getApp(appId: string, adminToken: string): Promise<InstantApp | null> {
    try {
      const body = await instantRequest<{ app: { id: string; title: string } }>(
        this.apiHost,
        'GET',
        `/dash/apps/${appId}`,
        adminToken,
      );
      return { id: body.app.id, title: body.app.title };
    } catch (err) {
      if (err instanceof InstantApiError && err.status === 404) return null;
      throw err;
    }
  }

  /** Delete an app and everything in it. */
  async deleteApp(appId: string, adminToken: string): Promise<void> {
    await instantRequest(this.apiHost, 'DELETE', `/dash/apps/${appId}`, adminToken);
  }

  /**
   * Whether a personal access token is valid.
   *
   * The Instant MCP bridge uses the same check: a token that lists the
   * caller's tokens is a token that exists.
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      await instantRequest(this.apiHost, 'GET', '/dash/personal_access_tokens', token);
      return true;
    } catch {
      return false;
    }
  }
}
