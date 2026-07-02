import { Logger } from '@nestjs/common';
import {
  DnsProvider, DnsRecord, CreateRecordOpts, UpdateRecordOpts, VerifyRecordOpts,
  ZoneInfo, ImportResult, SyncResult, DnsPlan, DnsRecordType,
} from './dns-provider.interface';
import type { ProviderConnection } from './dns-provider-factory';

/**
 * Route53DnsProvider — AWS Route53 implementation of DnsProvider.
 *
 * Uses the AWS SDK v3 (@aws-sdk/client-route-53). Credentials come from the
 * DomainConnection.credentials JSON: { accessKeyId, secretAccessKey, region }.
 *
 * IAM permissions required:
 *   route53:ListHostedZones
 *   route53:ListResourceRecordSets
 *   route53:ChangeResourceRecordSets
 *
 * Record changes use UPSERT semantics (CREATE would fail if record exists).
 */
export class Route53DnsProvider implements DnsProvider {
  readonly name = 'route53';
  private readonly logger = new Logger(Route53DnsProvider.name);
  private readonly credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };

  constructor(private connection: ProviderConnection) {
    const creds = (connection.credentials ?? {}) as Record<string, string>;
    this.credentials = {
      accessKeyId: creds.accessKeyId ?? '',
      secretAccessKey: creds.secretAccessKey ?? '',
      region: creds.region ?? 'us-east-1',
    };
  }

  private async getClient() {
    // Dynamic import — @aws-sdk/client-route-53 may not be installed in all environments
    const { Route53Client } = await import('@aws-sdk/client-route-53');
    return new Route53Client({
      region: this.credentials.region,
      credentials: {
        accessKeyId: this.credentials.accessKeyId,
        secretAccessKey: this.credentials.secretAccessKey,
      },
    });
  }

  async detectZone(domain: string): Promise<ZoneInfo | null> {
    const { ListHostedZonesCommand } = await import('@aws-sdk/client-route-53');
    const client = await this.getClient();
    const response = await client.send<{ HostedZones?: Array<{ Name?: string; Id?: string }> }>(new ListHostedZonesCommand({}));

    // Walk up domain labels to find the matching zone
    const labels = domain.replace(/\.$/, '').split('.');
    for (let i = 0; i < labels.length - 1; i++) {
      const candidate = labels.slice(i).join('.') + '.';
      const zone = response.HostedZones?.find((z: { Name?: string }) => z.Name === candidate);
      if (zone) {
        const zoneId = (zone.Id ?? '').replace('/hostedzone/', '');
        return { zoneId, zoneName: candidate.replace(/\.$/, '') };
      }
    }
    return null;
  }

  async getZoneId(domain: string): Promise<string | null> {
    const zoneInfo = await this.detectZone(domain);
    return zoneInfo?.zoneId ?? null;
  }

  async createRecord(opts: CreateRecordOpts): Promise<DnsRecord> {
    const { ChangeResourceRecordSetsCommand } = await import('@aws-sdk/client-route-53');
    const client = await this.getClient();
    const zoneInfo = await this.detectZone(opts.name);
    const zoneId = opts.zoneId || zoneInfo?.zoneId;
    if (!zoneId) throw new Error(`No Route53 zone found for ${opts.name}`);

    const changeBatch = {
      Changes: [
        {
          Action: 'UPSERT' as const,
          ResourceRecordSet: {
            Name: `${opts.name}.`,
            Type: opts.type as string,
            TTL: opts.ttl ?? 300,
            ResourceRecords: [{ Value: opts.content }],
            ...(opts.type === 'MX' && opts.priority !== undefined ? {} : {}),
          },
        },
      ],
    };

    // MX records need the priority in the content (Route53 format: "10 mail.example.com.")
    if (opts.type === 'MX' && opts.priority !== undefined) {
      changeBatch.Changes[0].ResourceRecordSet.ResourceRecords = [
        { Value: `${opts.priority} ${opts.content}` },
      ];
    }

    this.logger.log(`[route53] Creating ${opts.type} record: ${opts.name} -> ${opts.content}`);
    await client.send(new ChangeResourceRecordSetsCommand({
      HostedZoneId: zoneId,
      ChangeBatch: changeBatch,
    }));

    return {
      id: `${opts.name}:${opts.type}`, // Route53 doesn't return record IDs
      type: opts.type,
      name: opts.name,
      content: opts.content,
      ttl: opts.ttl ?? 300,
      priority: opts.priority,
    };
  }

  async updateRecord(opts: UpdateRecordOpts): Promise<void> {
    // Route53 UPSERT handles both create and update
    await this.createRecord(opts);
    this.logger.log(`[route53] Updated record ${opts.name} (${opts.type})`);
  }

  async deleteRecord(opts: { zoneId: string; recordId: string }): Promise<void> {
    const { ChangeResourceRecordSetsCommand } = await import('@aws-sdk/client-route-53');
    const client = await this.getClient();
    // recordId format: "name:type"
    const [name, type] = opts.recordId.split(':');

    // Must fetch existing values to delete (Route53 requires full record set)
    const existing = await this.listRecords({ zoneId: opts.zoneId, name, type: type as DnsRecordType });
    if (existing.length === 0) {
      this.logger.warn(`[route53] Record ${opts.recordId} not found — skipping delete`);
      return;
    }

    const changes = existing.map(record => ({
      Action: 'DELETE' as const,
      ResourceRecordSet: {
        Name: `${record.name}.`,
        Type: record.type as string,
        TTL: record.ttl ?? 300,
        ...(record.priority !== undefined
          ? { ResourceRecords: [{ Value: `${record.priority} ${record.content}` }] }
          : { ResourceRecords: [{ Value: record.content }] }),
      },
    }));

    await client.send(new ChangeResourceRecordSetsCommand({
      HostedZoneId: opts.zoneId,
      ChangeBatch: { Changes: changes },
    }));
    this.logger.log(`[route53] Deleted ${existing.length} records matching ${opts.recordId}`);
  }

  async listRecords(opts: { zoneId: string; name?: string; type?: DnsRecordType }): Promise<DnsRecord[]> {
    const { ListResourceRecordSetsCommand } = await import('@aws-sdk/client-route-53');
    const client = await this.getClient();

    const params: Record<string, unknown> = { HostedZoneId: opts.zoneId };
    if (opts.name) params['StartRecordName'] = `${opts.name}.`;
    if (opts.type) params['StartRecordType'] = opts.type;

    const response = await client.send<{ ResourceRecordSets?: Array<any> }>(new ListResourceRecordSetsCommand(params as any));

    return (response.ResourceRecordSets ?? [])
      .filter((rrs: { Name?: string; Type?: string }) => {
        if (opts.name && !rrs.Name?.startsWith(opts.name)) return false;
        if (opts.type && rrs.Type !== opts.type) return false;
        return true;
      })
      .map((rrs: any) => {
        const content = rrs.ResourceRecords?.[0]?.Value ?? '';
        // Parse MX priority from content (Route53 stores "10 mail.example.com.")
        if (rrs.Type === 'MX' && content) {
          const [prio, ...rest] = content.split(/\s+/);
          return {
            id: `${rrs.Name}:${rrs.Type}`,
            type: rrs.Type as DnsRecordType,
            name: (rrs.Name ?? '').replace(/\.$/, ''),
            content: rest.join(' ').replace(/\.$/, ''),
            ttl: rrs.TTL ?? 300,
            priority: parseInt(prio, 10),
          };
        }
        return {
          id: `${rrs.Name}:${rrs.Type}`,
          type: rrs.Type as DnsRecordType,
          name: (rrs.Name ?? '').replace(/\.$/, ''),
          content: content.replace(/\.$/, ''),
          ttl: rrs.TTL ?? 300,
        };
      });
  }

  async verifyRecord(opts: VerifyRecordOpts): Promise<boolean> {
    const records = await this.listRecords({
      zoneId: opts.zoneId,
      name: opts.name,
      type: opts.type,
    });
    return records.some(r => r.content === opts.expectedContent);
  }

  async importZone(domain: string): Promise<ImportResult> {
    const zoneInfo = await this.detectZone(domain);
    if (!zoneInfo) {
      return { imported: 0, warnings: [`No Route53 zone found for ${domain}`], records: [] };
    }
    const records = await this.listRecords({ zoneId: zoneInfo.zoneId });
    this.logger.log(`[route53] Imported ${records.length} records from zone ${zoneInfo.zoneName}`);
    return { imported: records.length, warnings: [], records };
  }

  async syncZone(_domainId: string): Promise<SyncResult> {
    this.logger.warn(`[route53] syncZone not yet implemented for domain ${_domainId}`);
    return { created: 0, updated: 0, deleted: 0, warnings: ['Sync not yet implemented'] };
  }

  async planZone(_domainId: string): Promise<DnsPlan> {
    return { create: [], update: [], delete: [], warnings: ['Plan not yet implemented'] };
  }

  // Platform subdomains are not applicable for Route53 (that's our own Cloudflare zone)
  async createPlatformSubdomain(_subdomain: string): Promise<DnsRecord> {
    throw new Error('Platform subdomains are only supported on the platform Cloudflare zone');
  }

  async deletePlatformSubdomain(_subdomain: string): Promise<void> {
    throw new Error('Platform subdomains are only supported on the platform Cloudflare zone');
  }
}
