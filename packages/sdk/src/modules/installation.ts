import { FidscriptClient } from '../client';

export interface CloudflareOAuthSettings {
  enabled: boolean;
  connectedAt: string | null;
  lastValidatedAt: string | null;
}

export interface CloudflareOAuthCredentials {
  clientId?: string;
  clientSecret?: string;
  enabled?: boolean;
}

export class InstallationModule {
  constructor(private client: FidscriptClient) {}

  /**
   * Get Cloudflare OAuth status at the platform level.
   */
  async getCloudflareOAuthStatus(): Promise<{ enabled: boolean }> {
    return this.client.get(`/api/v1/installation/cloudflare-oauth-status`);
  }

  /**
   * Update Cloudflare OAuth credentials at the platform level.
   * Set clientId/clientSecret to null to disable.
   */
  async updateCloudflareOAuth(credentials: CloudflareOAuthCredentials): Promise<{ success: boolean }> {
    return this.client.patch(`/api/v1/installation/cloudflare-oauth`, credentials);
  }

  /**
   * Test Cloudflare OAuth credentials before saving.
   */
  async testCloudflareConnection(clientId: string, clientSecret: string): Promise<{ valid: boolean }> {
    return this.client.post(`/api/v1/installation/test-cloudflare-connection`, { clientId, clientSecret });
  }
}
