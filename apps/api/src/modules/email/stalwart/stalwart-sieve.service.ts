import { Injectable } from '@nestjs/common';
import { StalwartJmapService } from '@/modules/email/stalwart/stalwart-core.service';

/**
 * Stalwart Sieve script management.
 * Sieve scripts handle server-side mail routing: forwarding, filtering, catch-all.
 */
@Injectable()
export class StalwartSieveService {
  constructor(private stalwart: StalwartJmapService) {}

  async getSieveScript(stalwartAccountId: string): Promise<{ script: string; name: string } | null> {
    const res = await this.stalwart.jmapCall([
      ['jmapSieveScriptQuery', { accountId: stalwartAccountId }],
    ]);
    const data = res.methodResponses[0][1] as {
      list?: Array<{ name: string; script: string }>;
    };
    return data?.list?.[0] ?? null;
  }

  async setSieveScript(stalwartAccountId: string, script: string, name = 'active'): Promise<void> {
    await this.stalwart.jmapCall([
      [
        'jmapSieveScriptSet',
        {
          accountId: stalwartAccountId,
          ifInState: null,
          create: { s1: { name, script } },
          destroyNames: [],
          onSuccessUpdateScript: { s1: name },
        },
      ],
    ]);
  }

  async deleteSieveScript(stalwartAccountId: string, scriptName: string): Promise<void> {
    await this.stalwart.jmapCall([
      [
        'jmapSieveScriptSet',
        {
          accountId: stalwartAccountId,
          ifInState: null,
          create: {},
          destroyNames: [scriptName],
          onSuccessUpdateScript: null,
        },
      ],
    ]);
  }
}
