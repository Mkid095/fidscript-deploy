import {
  Controller, Get, Post, Param, Query, Body, UseGuards, Req,
  HttpCode, HttpStatus, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { PrismaService } from '@/prisma/prisma.service';
import { DomainAccessService } from '@/modules/domains/services/domain-access.service';
import { DnsProviderFactory } from '@/modules/domains/providers/dns-provider-factory';
import { DomainChangeSetService } from '@/modules/domains/services/domain-changeset.service';
import { Request } from 'express';

/**
 * DomainsZoneController
 *
 * Handles zone-level DNS operations: import existing records, sync desired state,
 * export zone as JSON, and preview changes before applying (dns-plan).
 *
 * These are the safest endpoints in the domain system:
 *   - import: read-only (fetches from provider)
 *   - export: read-only (returns JSON)
 *   - plan: read-only (dry run)
 *   - sync: writes, but only to platform-managed records (never deletes
 *     records it didn't create)
 *
 * CRITICAL: import-zone must be called before any auto-configuration
 * to avoid destroying existing production DNS records.
 */
@ApiTags('domains-zone')
@Controller('projects/:projectId/domains')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DomainsZoneController {
  private readonly logger = new Logger(DomainsZoneController.name);

  constructor(
    private prisma: PrismaService,
    private access: DomainAccessService,
    private factory: DnsProviderFactory,
    private changeSetService: DomainChangeSetService,
  ) {}

  /**
   * Import all existing DNS records from the provider for this domain's zone.
   * Read-only operation — does not modify anything. Returns a snapshot.
   *
   * Call this BEFORE auto-configuration to see what already exists.
   */
  @Post(':id/import-zone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import existing DNS records from provider zone' })
  async importZone(
    @Param('projectId') projectId: string,
    @Param('id') domainId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.userId ?? 'system';
    await this.access.ensureAccess(userId, projectId);

    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
      include: { dnsConnection: true },
    });
    if (!domain) throw new NotFoundException('Domain not found');
    if (!domain.dnsConnection) {
      throw new BadRequestException('No DNS connection — connect a provider first');
    }

    const provider = this.factory.getProvider(domain.dnsConnection as any);
    const result = await provider.importZone(domain.domain);

    return {
      domain: domain.domain,
      zoneImported: result.imported,
      warnings: result.warnings,
      records: result.records,
    };
  }

  /**
   * Sync platform-managed DNS records with the provider's actual state.
   * Never deletes records the platform didn't create.
   */
  @Post(':id/sync-zone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync platform DNS records with provider' })
  async syncZone(
    @Param('projectId') projectId: string,
    @Param('id') domainId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.userId ?? 'system';
    await this.access.ensureAccess(userId, projectId);

    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
      include: { dnsConnection: true },
    });
    if (!domain) throw new NotFoundException('Domain not found');
    if (!domain.dnsConnection) {
      throw new BadRequestException('No DNS connection — connect a provider first');
    }

    const provider = this.factory.getProvider(domain.dnsConnection as any);
    const result = await provider.syncZone(domainId);

    return {
      domain: domain.domain,
      created: result.created,
      updated: result.updated,
      deleted: result.deleted,
      warnings: result.warnings,
    };
  }

  /**
   * Export all DNS records for a domain's zone as JSON.
   * Read-only — useful for backups and migrations.
   */
  @Get(':id/export-zone')
  @ApiOperation({ summary: 'Export DNS zone records as JSON' })
  async exportZone(
    @Param('projectId') projectId: string,
    @Param('id') domainId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.userId ?? 'system';
    await this.access.ensureAccess(userId, projectId);

    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
      include: { dnsConnection: true },
    });
    if (!domain) throw new NotFoundException('Domain not found');
    if (!domain.dnsConnection) {
      throw new BadRequestException('No DNS connection — connect a provider first');
    }

    const provider = this.factory.getProvider(domain.dnsConnection as any);
    const zoneInfo = await provider.detectZone(domain.domain);
    if (!zoneInfo) {
      throw new NotFoundException('Zone not found in provider');
    }

    const records = await provider.listRecords({ zoneId: zoneInfo.zoneId });

    return {
      domain: domain.domain,
      zoneId: zoneInfo.zoneId,
      zoneName: zoneInfo.zoneName,
      provider: domain.dnsConnection.provider,
      exportedAt: new Date().toISOString(),
      recordCount: records.length,
      records,
    };
  }

  /**
   * Preview what changes sync would make without applying them.
   * Returns create/update/delete arrays + warnings.
   *
   * This is the "dry run" — always call before destructive operations.
   */
  @Post(':id/dns-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview DNS changes before applying (dry run)' })
  async planZone(
    @Param('projectId') projectId: string,
    @Param('id') domainId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.userId ?? 'system';
    await this.access.ensureAccess(userId, projectId);

    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
      include: { dnsConnection: true },
    });
    if (!domain) throw new NotFoundException('Domain not found');
    if (!domain.dnsConnection) {
      throw new BadRequestException('No DNS connection — connect a provider first');
    }

    const provider = this.factory.getProvider(domain.dnsConnection as any);
    const plan = await provider.planZone(domainId);

    return {
      domain: domain.domain,
      ...plan,
    };
  }

  // ── Change Sets + Rollback ────────────────────────────────────────────────

  /**
   * List change sets for a domain (audit trail).
   */
  @Get(':id/change-sets')
  @ApiOperation({ summary: 'List DNS change sets for a domain' })
  async listChangeSets(
    @Param('projectId') projectId: string,
    @Param('id') domainId: string,
    @Req() req: Request,
    @Query('limit') limit?: string,
  ) {
    const userId = (req as any).user?.userId ?? 'system';
    await this.access.ensureAccess(userId, projectId);
    return this.changeSetService.listChangeSets(domainId, {
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Get managed DNS records for a domain (ownership inventory).
   */
  @Get(':id/managed-records')
  @ApiOperation({ summary: 'Get managed DNS records for a domain' })
  async getManagedRecords(
    @Param('projectId') projectId: string,
    @Param('id') domainId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.userId ?? 'system';
    await this.access.ensureAccess(userId, projectId);
    const records = await this.changeSetService.getManagedRecords(domainId);
    return { records };
  }

  /**
   * Import existing provider records into the managed records table.
   * Records not already tracked are marked as 'imported' (never auto-deleted).
   */
  @Post(':id/import-managed-records')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import provider records into managed records table' })
  async importManagedRecords(
    @Param('projectId') projectId: string,
    @Param('id') domainId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.userId ?? 'system';
    await this.access.ensureAccess(userId, projectId);
    return this.changeSetService.importProviderRecords(domainId);
  }

  /**
   * Create a change set from a list of operations.
   * Does NOT apply — use POST /change-sets/:id/apply to execute.
   */
  @Post(':id/change-sets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a DNS change set (pending — not yet applied)' })
  async createChangeSet(
    @Param('projectId') projectId: string,
    @Param('id') domainId: string,
    @Body() body: { operations: Array<Record<string, unknown>> },
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.userId ?? 'system';
    await this.access.ensureAccess(userId, projectId);
    return this.changeSetService.createChangeSet(domainId, projectId, body.operations as any, userId);
  }

  /**
   * Apply a change set — executes all planned operations atomically.
   */
  @Post('change-sets/:changeSetId/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a DNS change set' })
  async applyChangeSet(
    @Param('projectId') projectId: string,
    @Param('changeSetId') changeSetId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.userId ?? 'system';
    await this.access.ensureAccess(userId, projectId);
    return this.changeSetService.applyChangeSet(changeSetId);
  }

  /**
   * Rollback a change set — reverses all applied operations.
   */
  @Post('change-sets/:changeSetId/rollback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rollback a DNS change set' })
  async rollbackChangeSet(
    @Param('projectId') projectId: string,
    @Param('changeSetId') changeSetId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.userId ?? 'system';
    await this.access.ensureAccess(userId, projectId);
    return this.changeSetService.rollbackChangeSet(changeSetId, userId);
  }
}
