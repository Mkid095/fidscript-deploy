import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { StalwartJmapService } from '@/modules/email/stalwart/stalwart-core.service';

/**
 * Stalwart sender identity (JmapIdentity) management.
 * Identities are per-account — associated with the Stalwart account id.
 */
@Injectable()
export class StalwartIdentityService {
  constructor(private stalwart: StalwartJmapService) {}

  async createIdentity(
    stalwartAccountId: string,
    email: string,
    name?: string,
  ): Promise<{ id: string; name?: string }> {
    const res = await this.stalwart.jmapCall([
      [
        'jmapIdentityCreate',
        {
          accountId: stalwartAccountId,
          creates: {
            i1: {
              email,
              ...(name ? { realName: name } : {}),
              repliedTo: null,
              bcc: null,
            },
          },
        },
      ],
    ]);

    const data = res.methodResponses[0][1] as { created?: Record<string, { id: string }> };
    const idData = data?.created?.i1;
    if (!idData) throw new InternalServerErrorException('Stalwart did not return identity id');
    return { id: idData.id, name };
  }

  async deleteIdentity(stalwartAccountId: string, identityId: string): Promise<void> {
    await this.stalwart.jmapCall([
      [
        'jmapIdentityDestroy',
        { accountId: stalwartAccountId, destroy: [identityId] },
      ],
    ]);
  }

  async listIdentities(
    stalwartAccountId: string,
  ): Promise<Array<{ id: string; email: string; realName?: string }>> {
    const res = await this.stalwart.jmapCall([
      ['jmapIdentityGet', { accountId: stalwartAccountId, ids: null }],
    ]);
    const data = res.methodResponses[0][1] as {
      list?: Array<{ id: string; email: string; realName?: string }>;
    };
    return data?.list ?? [];
  }
}
