import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DnsProvider } from '@/modules/domains/providers/dns-provider.interface';
import { createHash } from 'crypto';

export interface DnsOperation {
  action: 'create' | 'update' | 'delete';
  // For update/delete: the managed record ID
  recordId?: string;
  // For create/update: the desired state
  type?: string;
  name?: string;
  value?: string;
  ttl?: number;
  priority?: number;
  proxied?: boolean;
  source?: string;
  // For update/delete: the previous state (for rollback)
  oldValue?: string;
  oldType?: string;
  oldName?: string;
}

export interface ChangeSetResult {
  id: string;
  status: 'pending' | 'applied' | 'failed' | 'rolled_back';
  operations: DnsOperation[];
  appliedAt?: string;
  result?: {
    created: number;
    updated: number;
    deleted: number;
    errors: string[];
  };
}

/**
 * DomainChangeSetService
 *
 * Manages DNS change sets — atomic batches of DNS operations with full
 * audit trail and rollback capability.
 *
 * Every DNS modification goes through a change set:
 *   1. Create change set with planned operations (status=pending)
 *   2. Apply operations via DnsProvider (status=applied or failed)
 *   3. Optionally rollback (reverses operations, status=rolled_back)
 *
 * The ManagedDnsRecord table is the source of truth for what records
 * belong to FIDScript. Change sets update both the provider AND the
 * ManagedDnsRecord table atomically.
 *
 * Safety rules:
 *   - Never delete records with managedBy='imported' without explicit consent
 *   - Rollback only reverses what the change set did (not subsequent changes)
 *   - All operations are logged with timestamps and actor
 */
@Injectable()
export class DomainChangeSetService {
  private readonly logger = new Logger(DomainChangeSetService.name);

  constructor(
    private prisma: PrismaService,
    @Inject('DNS_PROVIDER') private dnsProvider: DnsProvider,
  ) {}

  /**
   * Create a change set from a DNS plan.
   * Does NOT apply it — just records the planned operations.
   */
  async createChangeSet(
    domainId: string,
    projectId: string,
    operations: DnsOperation[],
    createdBy?: string,
  ): Promise<{ id: string; status: 'pending' }> {
    if (operations.length === 0) {
      throw new BadRequestException('Change set must contain at least one operation');
    }

    const changeSet = await (this.prisma as any).domainChangeSet.create({
      data: {
        domainId,
        projectId,
        status: 'pending',
        operations: operations as any,
        createdBy,
      },
    });

    this.logger.log(`[changeset] Created ${changeSet.id} with ${operations.length} operations for domain ${domainId}`);
    return { id: changeSet.id, status: 'pending' };
  }

  /**
   * Apply a change set — executes all planned operations.
   * Updates both the DNS provider AND the ManagedDnsRecord table.
   */
  async applyChangeSet(changeSetId: string): Promise<ChangeSetResult> {
    const changeSet = await (this.prisma as any).domainChangeSet.findUnique({
      where: { id: changeSetId },
    });
    if (!changeSet) throw new NotFoundException('Change set not found');
    if (changeSet.status === 'applied') throw new BadRequestException('Change set already applied');
    if (changeSet.status === 'rolled_back') throw new BadRequestException('Cannot apply a rolled-back change set');

    const domain = await this.prisma.domain.findUnique({
      where: { id: changeSet.domainId },
      include: { dnsConnection: true },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    const operations = changeSet.operations as DnsOperation[];
    const errors: string[] = [];
    let created = 0, updated = 0, deleted = 0;

    const zoneId = await this.dnsProvider.getZoneId(domain.domain);

    for (const op of operations) {
      try {
        if (op.action === 'create') {
          // Create in provider
          if (zoneId && op.type && op.name && op.value) {
            const record = await this.dnsProvider.createRecord({
              zoneId, type: op.type as any, name: op.name,
              content: op.value, ttl: op.ttl ?? 300,
              priority: op.priority, proxied: op.proxied ?? false,
            });
            // Track in ManagedDnsRecord
            await (this.prisma as any).managedDnsRecord.upsert({
              where: { domainId_type_name: { domainId: domain.id, type: op.type, name: op.name } },
              create: {
                domainId: domain.id,
                providerRecordId: record.id,
                type: op.type, name: op.name, value: op.value,
                ttl: op.ttl ?? 300, priority: op.priority, proxied: op.proxied ?? false,
                managedBy: 'platform', source: op.source ?? 'manual',
                checksum: this.checksum(op.type, op.name, op.value),
                lastSyncedAt: new Date(),
              },
              update: {
                providerRecordId: record.id,
                value: op.value, ttl: op.ttl ?? 300,
                checksum: this.checksum(op.type, op.name, op.value),
                lastSyncedAt: new Date(),
              },
            });
          }
          created++;
        } else if (op.action === 'update' && op.recordId) {
          // Fetch the managed record to get provider ID + old values
          const managed = await (this.prisma as any).managedDnsRecord.findUnique({
            where: { id: op.recordId },
          });
          if (!managed) throw new Error(`Managed record ${op.recordId} not found`);
          if (managed.managedBy === 'imported') {
            throw new Error(`Cannot update imported record ${op.recordId} without explicit consent`);
          }

          // Update in provider
          if (zoneId && managed.providerRecordId) {
            await this.dnsProvider.updateRecord({
              zoneId, recordId: managed.providerRecordId,
              type: (op.type ?? managed.type) as any,
              name: op.name ?? managed.name,
              content: op.value ?? managed.value,
              ttl: op.ttl ?? managed.ttl,
              priority: op.priority ?? managed.priority,
              proxied: op.proxied ?? managed.proxied,
            });
          }

          // Update ManagedDnsRecord
          const newType = op.type ?? managed.type;
          const newName = op.name ?? managed.name;
          const newValue = op.value ?? managed.value;
          await (this.prisma as any).managedDnsRecord.update({
            where: { id: op.recordId },
            data: {
              type: newType, name: newName, value: newValue,
              ttl: op.ttl ?? managed.ttl,
              priority: op.priority ?? managed.priority,
              checksum: this.checksum(newType, newName, newValue),
              lastSyncedAt: new Date(),
            },
          });
          updated++;
        } else if (op.action === 'delete' && op.recordId) {
          const managed = await (this.prisma as any).managedDnsRecord.findUnique({
            where: { id: op.recordId },
          });
          if (!managed) {
            this.logger.warn(`[changeset] Record ${op.recordId} not found — skipping delete`);
            continue;
          }
          if (managed.managedBy === 'imported') {
            throw new Error(`Cannot delete imported record ${op.recordId} without explicit consent`);
          }

          // Delete from provider
          if (zoneId && managed.providerRecordId) {
            await this.dnsProvider.deleteRecord({ zoneId, recordId: managed.providerRecordId });
          }

          // Delete from ManagedDnsRecord
          await (this.prisma as any).managedDnsRecord.delete({
            where: { id: op.recordId },
          });
          deleted++;
        }
      } catch (err) {
        errors.push(`${op.action} ${op.type ?? op.recordId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const status = errors.length === operations.length ? 'failed' : 'applied';
    await (this.prisma as any).domainChangeSet.update({
      where: { id: changeSetId },
      data: {
        status,
        appliedAt: new Date(),
        result: { created, updated, deleted, errors } as any,
      },
    });

    this.logger.log(`[changeset] Applied ${changeSetId}: ${created}c ${updated}u ${deleted}d (${errors.length} errors)`);

    return {
      id: changeSetId,
      status: status as ChangeSetResult['status'],
      operations,
      appliedAt: new Date().toISOString(),
      result: { created, updated, deleted, errors },
    };
  }

  /**
   * Rollback a change set — reverses all applied operations.
   * Creates become deletes, deletes become creates, updates revert to old values.
   */
  async rollbackChangeSet(changeSetId: string, rolledBackBy?: string): Promise<ChangeSetResult> {
    const changeSet = await (this.prisma as any).domainChangeSet.findUnique({
      where: { id: changeSetId },
    });
    if (!changeSet) throw new NotFoundException('Change set not found');
    if (changeSet.status !== 'applied') {
      throw new BadRequestException(`Cannot rollback change set with status: ${changeSet.status}`);
    }

    const domain = await this.prisma.domain.findUnique({
      where: { id: changeSet.domainId },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    const operations = changeSet.operations as DnsOperation[];
    const errors: string[] = [];
    let created = 0, updated = 0, deleted = 0;

    const zoneId = await this.dnsProvider.getZoneId(domain.domain);

    // Reverse each operation
    for (const op of [...operations].reverse()) {
      try {
        if (op.action === 'create') {
          // Reverse: delete what we created
          if (zoneId && op.type && op.name) {
            const existing = await this.dnsProvider.listRecords({
              zoneId, name: op.name, type: op.type as any,
            });
            for (const record of existing) {
              await this.dnsProvider.deleteRecord({ zoneId, recordId: record.id });
            }
            // Also remove from ManagedDnsRecord
            await (this.prisma as any).managedDnsRecord.deleteMany({
              where: { domainId: domain.id, type: op.type, name: op.name },
            }).catch(() => {});
          }
          deleted++;
        } else if (op.action === 'delete' && op.recordId) {
          // Reverse: recreate what we deleted (using old values)
          if (zoneId && op.oldType && op.oldName && op.oldValue) {
            await this.dnsProvider.createRecord({
              zoneId, type: op.oldType as any, name: op.oldName,
              content: op.oldValue, ttl: 300,
            });
          }
          created++;
        } else if (op.action === 'update' && op.recordId) {
          // Reverse: revert to old values
          if (zoneId && op.oldValue) {
            const managed = await (this.prisma as any).managedDnsRecord.findUnique({
              where: { id: op.recordId },
            });
            if (managed && managed.providerRecordId) {
              await this.dnsProvider.updateRecord({
                zoneId, recordId: managed.providerRecordId,
                type: (op.oldType ?? managed.type) as any,
                name: op.oldName ?? managed.name,
                content: op.oldValue,
                ttl: managed.ttl,
              });
              await (this.prisma as any).managedDnsRecord.update({
                where: { id: op.recordId },
                data: {
                  value: op.oldValue,
                  type: op.oldType ?? managed.type,
                  name: op.oldName ?? managed.name,
                  checksum: this.checksum(op.oldType ?? managed.type, op.oldName ?? managed.name, op.oldValue),
                  lastSyncedAt: new Date(),
                },
              });
            }
          }
          updated++;
        }
      } catch (err) {
        errors.push(`rollback ${op.action}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    await (this.prisma as any).domainChangeSet.update({
      where: { id: changeSetId },
      data: {
        status: 'rolled_back',
        rolledBackAt: new Date(),
        rolledBackBy,
      },
    });

    this.logger.log(`[changeset] Rolled back ${changeSetId}: ${created}c ${updated}u ${deleted}d`);

    return {
      id: changeSetId,
      status: 'rolled_back',
      operations,
      result: { created, updated, deleted, errors },
    };
  }

  /**
   * List change sets for a domain (newest first).
   */
  async listChangeSets(domainId: string, options: { limit?: number } = {}): Promise<{
    changeSets: ChangeSetResult[];
    total: number;
  }> {
    const limit = Math.min(options.limit ?? 20, 100);
    const where = { domainId };
    const [rows, total] = await Promise.all([
      (this.prisma as any).domainChangeSet.findMany({
        where, orderBy: { createdAt: 'desc' }, take: limit,
      }),
      (this.prisma as any).domainChangeSet.count({ where }),
    ]);

    return {
      changeSets: rows.map((r: any) => ({
        id: r.id,
        status: r.status,
        operations: r.operations,
        appliedAt: r.appliedAt?.toISOString(),
        result: r.result,
      })),
      total,
    };
  }

  /**
   * Get the managed DNS records for a domain.
   * These are records FIDScript knows about and tracks.
   */
  async getManagedRecords(domainId: string): Promise<any[]> {
    return (this.prisma as any).managedDnsRecord.findMany({
      where: { domainId },
      orderBy: [{ managedBy: 'asc' }, { type: 'asc' }],
    });
  }

  /**
   * Import existing provider records into the ManagedDnsRecord table.
   * Records that don't match any existing managed record are marked as 'imported'.
   */
  async importProviderRecords(domainId: string): Promise<{ imported: number; total: number }> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    const zoneId = await this.dnsProvider.getZoneId(domain.domain);
    if (!zoneId) throw new BadRequestException('No zone found for domain');

    const providerRecords = await this.dnsProvider.listRecords({ zoneId });
    const existing = await (this.prisma as any).managedDnsRecord.findMany({
      where: { domainId },
    });

    let imported = 0;
    for (const record of providerRecords) {
      // Check if we already track this record
      const tracked = existing.find((m: any) =>
        m.type === record.type && m.name === record.name,
      );
      if (tracked) {
        // Update provider ID if missing
        if (!tracked.providerRecordId && record.id) {
          await (this.prisma as any).managedDnsRecord.update({
            where: { id: tracked.id },
            data: { providerRecordId: record.id, lastSyncedAt: new Date() },
          });
        }
        continue;
      }

      // Import as a foreign record
      await (this.prisma as any).managedDnsRecord.create({
        data: {
          domainId,
          providerRecordId: record.id,
          type: record.type,
          name: record.name,
          value: record.content,
          ttl: record.ttl ?? 300,
          priority: record.priority,
          proxied: record.proxied ?? false,
          managedBy: 'imported',
          source: 'imported',
          checksum: this.checksum(record.type, record.name, record.content),
          lastSyncedAt: new Date(),
        },
      }).catch(() => {/* unique constraint — already tracked */});
      imported++;
    }

    this.logger.log(`[changeset] Imported ${imported} records for domain ${domain.domain}`);
    return { imported, total: providerRecords.length };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private checksum(type: string, name: string, value: string): string {
    return createHash('sha256').update(`${type}:${name}:${value}`).digest('hex');
  }
}
