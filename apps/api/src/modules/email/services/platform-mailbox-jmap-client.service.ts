/**
 * Shared JMAP client factory for the platform-mailbox services.
 *
 * Authenticates to Stalwart as a specific platform mailbox (local part) and
 * returns an axios client + the mailbox's accountId. Each platform mailbox
 * has its own credentials (see EmailBootstrapService), so we can't share
 * the admin's JMAP session.
 */
import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosInstance } from 'axios';
import * as http from 'http';
import { IEmailProvider, EMAIL_PROVIDER } from '@/modules/email/providers/i-email-provider';
import { basicAuthHeader } from '@/common/basic-auth';

@Injectable()
export class PlatformMailboxJmapClientService {
  private readonly logger = new Logger(PlatformMailboxJmapClientService.name);
  private readonly smtpPassword: string;

  constructor(
    private config: ConfigService,
    @Inject(EMAIL_PROVIDER) private readonly email: IEmailProvider,
  ) {
    this.smtpPassword = this.config.get<string>('SYSTEM_MAILBOX_PASSWORD', '');
  }

  /**
   * Authenticate to Stalwart as a specific platform mailbox.
   * Accepts either "alert" or "alert@deploy.fidscript.com" — strips the domain if present.
   */
  async clientFor(
    mailboxLocalPartOrEmail: string,
  ): Promise<{ client: AxiosInstance; accountId: string; localPart: string }> {
    const jmapUrl = this.config
      .get<string>('STALWART_JMAP_URL', 'http://fidscript_stalwart:8080')
      .replace(/\/+$/, '');
    const domain = this.config.get<string>('PLATFORM_DOMAIN', 'deploy.fidscript.com');
    const localPart = mailboxLocalPartOrEmail.includes('@')
      ? mailboxLocalPartOrEmail.split('@')[0]
      : mailboxLocalPartOrEmail;
    const user = `${localPart}@${domain}`;
    const pass = this.smtpPassword;
    const creds = basicAuthHeader(user, pass);

    const session = await new Promise<{
      primaryAccounts: Record<string, string>;
      accounts: Record<string, unknown>;
    }>((resolve, reject) => {
      const req = http.request(
        {
          host: jmapUrl.replace(/^https?:\/\//, '').split(':')[0],
          port: 8080,
          path: '/jmap/session',
          method: 'GET',
          headers: { authorization: `Basic ${creds}` },
        },
        (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => {
            if (res.statusCode !== 200) return reject(new Error(`JMAP session: ${res.statusCode} ${d}`));
            try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
          });
        },
      );
      req.on('error', reject);
      req.end();
    });
    const accountId = session.primaryAccounts?.['urn:ietf:params:jmap:mail'] ?? Object.keys(session.accounts)[0];
    if (!accountId) throw new NotFoundException(`No JMAP account for ${user}`);

    const axios = require('axios') as typeof import('axios');
    const client = axios.create({
      baseURL: `${jmapUrl}/jmap`,
      headers: { 'Content-Type': 'application/json', authorization: `Basic ${creds}` },
      timeout: 15000,
    });
    return { client, accountId, localPart };
  }

  /**
   * Issue a JMAP call against a per-mailbox client.
   */
  async call<T>(
    client: AxiosInstance,
    method: string,
    args: Record<string, unknown>,
    using: string[],
  ): Promise<T> {
    const response = await client.post<{
      methodResponses: Array<[string, Record<string, unknown>, string]>;
    }>('', { using, methodCalls: [[method, args, '0']] });
    const [name, result] = response.data.methodResponses[0];
    if (name !== method) throw new Error(`JMAP method mismatch: expected ${method}, got ${name}`);
    if ((result as { type?: string }).type === 'error') {
      const err = result as { type: string; description?: string };
      throw new Error(`JMAP ${method} error: ${err.description ?? err.type}`);
    }
    return result as T;
  }
}
