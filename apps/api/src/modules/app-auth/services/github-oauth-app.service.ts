import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * The GitHub OAuth app this deployment uses.
 *
 * A deployment may not have one — the installer writes placeholders until
 * somebody registers an app on github.com. `isConfigured` is what tells the
 * API and the dashboard that, so nobody is offered a popup that cannot work.
 */
@Injectable()
export class GithubOAuthAppService {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly platformBaseUrl: string;

  constructor(configService: ConfigService) {
    this.platformBaseUrl =
      configService.get<string>('PLATFORM_PUBLIC_URL') ||
      configService.get<string>('PLATFORM_BASE_URL') ||
      'http://localhost:3001';
    this.clientId =
      configService.get<string>('GITHUB_CLIENT_ID') || process.env.GITHUB_CLIENT_ID || '';
    this.clientSecret =
      configService.get<string>('GITHUB_CLIENT_SECRET') || process.env.GITHUB_CLIENT_SECRET || '';
  }

  /** Whether a real OAuth app is configured — not the installer's placeholder. */
  isConfigured(): boolean {
    return Boolean(
      this.clientId &&
        this.clientSecret &&
        !this.clientId.startsWith('REPLACE_WITH') &&
        !this.clientSecret.startsWith('REPLACE_WITH'),
    );
  }

  /** Where GitHub sends the person back to. */
  callbackUrl(): string {
    return `${this.platformBaseUrl}/api/v1/users/me/github/callback`;
  }
}
