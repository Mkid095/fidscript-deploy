import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { StalwartJmapService } from './stalwart-core.service';

/**
 * Stalwart account (mailbox user) management.
 * Each account = one IMAP/SMTP mailbox identity in Stalwart.
 */
@Injectable()
export class StalwartAccountService {
  constructor(private stalwart: StalwartJmapService) {}

  async createAccount(
    email: string,
    password: string,
    displayName?: string,
    quotaMb = 1024,
  ): Promise<{ id: string; name: string }> {
    const res = await this.stalwart.jmapCall([
      [
        'x:Account/set',
        {
          create: {
            a1: {
              name: email,
              ...(displayName ? { description: displayName } : {}),
              quota: { value: quotaMb, mode: 'soft' },
              secrets: [{ type: 'password', value: password }],
              status: 'active',
            },
          },
        },
      ],
    ]);

    const data = res.methodResponses[0][1] as { created?: Record<string, { id: string; name: string }> };
    const account = data?.created?.a1;
    if (!account) throw new InternalServerErrorException('Stalwart did not return account id');
    return account;
  }

  async setAccountStatus(stalwartAccountId: string, active: boolean): Promise<void> {
    await this.stalwart.jmapCall([
      [
        'x:Account/set',
        {
          update: {
            [stalwartAccountId]: { status: active ? 'active' : 'disabled' },
          },
        },
      ],
    ]);
  }

  async deleteAccount(stalwartAccountId: string): Promise<void> {
    await this.stalwart.jmapCall([
      ['x:Account/set', { destroy: [stalwartAccountId] }],
    ]);
  }

  async setAccountPassword(stalwartAccountId: string, newPassword: string): Promise<void> {
    await this.stalwart.jmapCall([
      [
        'x:Account/set',
        {
          update: {
            [stalwartAccountId]: {
              secrets: [{ type: 'password', value: newPassword }],
            },
          },
        },
      ],
    ]);
  }

  async listAccounts(): Promise<Array<{ id: string; name: string; status: string }>> {
    const res = await this.stalwart.jmapCall([['x:Account/get', {}]]);
    const data = res.methodResponses[0][1] as {
      list?: Array<{ id: string; name: string; status: string }>;
    };
    return data?.list ?? [];
  }
}
