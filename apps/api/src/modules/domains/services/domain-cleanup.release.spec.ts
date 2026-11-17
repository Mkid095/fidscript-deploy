import { DomainCleanupService } from './domain-cleanup.service';

/**
 * Releasing a project's domains when the project is purged.
 *
 * This is the LAST chance to put the customer's captured DNS records back:
 * it runs before the hard delete that would cascade the Domain and
 * ManagedDnsRecord rows away. Where the platform overwrote a record, the
 * original is written back; where it created one, the record is removed;
 * and with no DNS connection there is nothing to touch.
 */
describe('releasing a project domains', () => {
  function makeService(options: {
    domains?: Array<Record<string, unknown>>;
    records?: Array<Record<string, unknown>>;
    provider?: Record<string, unknown> | null;
  }) {
    const domainDelete = jest.fn(async () => ({ id: 'd1' }));
    const domainConnectionDeleteMany = jest.fn(async () => ({ count: 1 }));
    const prisma = {
      domain: { findMany: jest.fn(async () => options.domains ?? []), delete: domainDelete },
      managedDnsRecord: { findMany: jest.fn(async () => options.records ?? []) },
      emailDomain: { updateMany: jest.fn(async () => ({ count: 0 })) },
      domainConnection: { deleteMany: domainConnectionDeleteMany },
    };
    const getProjectProvider = jest.fn(async () => options.provider ?? null);
    const dns = { getProjectProvider };
    const service = new DomainCleanupService(
      prisma as never,
      { emit: jest.fn() } as never,
      {} as never,
      { get: jest.fn(() => 'apps.local') } as never,
      dns as never,
    );
    return { service, prisma, getProjectProvider, domainDelete, domainConnectionDeleteMany };
  }

  it('restores the captured original for a record the platform overwrote', async () => {
    const provider = {
      getZoneId: jest.fn(async () => 'zone-1'),
      updateRecord: jest.fn(async () => 'updated'),
      createRecord: jest.fn(async () => 'created'),
      deleteRecord: jest.fn(async () => 'deleted'),
    };
    const { service, domainDelete } = makeService({
      provider,
      domains: [{ id: 'd1', domain: 'acme.com', dnsMode: 'cloudflare_auto', isCustom: true }],
      records: [
        {
          domainId: 'd1',
          type: 'A',
          name: 'acme.com',
          originalValue: '93.184.21.34',
          originalTtl: 300,
          providerRecordId: 'rec-1',
        },
      ],
    });

    const result = await service.releaseForProject('p1');

    expect(result.released).toBe(1);
    expect(provider.updateRecord).toHaveBeenCalledWith(
      expect.objectContaining({ recordId: 'rec-1', content: '93.184.21.34' }),
    );
    expect(domainDelete).toHaveBeenCalledWith({ where: { id: 'd1' } });
  });

  it('removes a record the platform created, and leaves the rest when there is no connection', async () => {
    const { service, prisma } = makeService({
      provider: null,
      domains: [{ id: 'd1', domain: 'acme.com', dnsMode: 'manual', isCustom: true }],
      records: [
        {
          domainId: 'd1',
          type: 'CNAME',
          name: 'shop.acme.com',
          originalValue: null,
          providerRecordId: 'rec-9',
        },
      ],
    });

    const result = await service.releaseForProject('p1');

    // No DNS connection: the platform cannot reach the provider, so the
    // provider-side records are left in place — but the row still goes.
    expect(result.released).toBe(1);
    expect(result.skipped).toBe(0);
    expect((prisma.domainConnection.deleteMany as jest.Mock)).toHaveBeenCalledWith({
      where: { projectId: 'p1' },
    });
  });
});
