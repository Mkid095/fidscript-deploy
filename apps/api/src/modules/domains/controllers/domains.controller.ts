import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
  Req, HttpCode, HttpStatus, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { PrismaService } from '@/prisma/prisma.service';
import { DomainsService } from '@/modules/domains/services/domains.service';
import { DomainReconciliationService } from '@/modules/domains/services/domain-reconciliation.service';
import { DomainAccessService } from '@/modules/domains/services/domain-access.service';
import { DomainWizardService } from '@/modules/domains/services/domain-wizard.service';
import { DomainRepairService } from '@/modules/domains/services/domain-repair.service';
import { DomainDnsDetectionService } from '@/modules/domains/services/domain-dns-detection.service';
import { DomainEmailKeyService } from '@/modules/domains/services/domain-email-key.service';
import { DomainEmailRecordsService } from '@/modules/domains/services/domain-email-records.service';
import { DomainPropagationService } from '@/modules/domains/services/domain-propagation.service';
import { UpdateRepairPolicyDto, TriggerRepairDto } from '@/modules/domains/dto/domain-repair.dto';
import { AddDomainDto } from '@/modules/domains/dto/add-domain.dto';
import { Request } from 'express';

@ApiTags('domains')
@Controller('projects/:projectId/domains')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DomainsController {
  constructor(
    private domainsService: DomainsService,
    private reconciliationService: DomainReconciliationService,
    private wizardService: DomainWizardService,
    private repairService: DomainRepairService,
    private accessService: DomainAccessService,
    private dnsDetection: DomainDnsDetectionService,
    private emailKeyService: DomainEmailKeyService,
    private emailRecordsService: DomainEmailRecordsService,
    private propagationService: DomainPropagationService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List project domains' })
  async list(@Req() req: Request, @Param('projectId') projectId: string) {
    const user = req.user as { userId: string };
    return this.domainsService.list(user.userId, projectId);
  }

  @Get('detect')
  @ApiOperation({ summary: 'Detect DNS provider for a domain by querying its nameservers' })
  async detectDnsProvider(@Query('domain') domain: string) {
    return this.dnsDetection.detect(domain);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a domain to a deployment (Mode A: manual DNS or Mode B: Cloudflare auto)' })
  async add(@Req() req: Request, @Param('projectId') projectId: string, @Body() dto: AddDomainDto) {
    const user = req.user as { userId: string };
    return this.domainsService.add(user.userId, projectId, dto);
  }

  @Get(':id/instructions')
  @ApiOperation({ summary: 'Get DNS instructions for a domain (Mode A)' })
  async getInstructions(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    return this.domainsService.getInstructions(user.userId, projectId, domainId);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify domain: DNS resolution + HTTP routing check' })
  async verify(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    return this.domainsService.verify(user.userId, projectId, domainId);
  }

  @Post('connect-cloudflare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connect Cloudflare account for Mode B auto-DNS' })
  async connectCloudflare(@Req() req: Request, @Param('projectId') projectId: string, @Body() body: { apiToken: string }) {
    const user = req.user as { userId: string };
    return this.domainsService.connectCloudflare(user.userId, projectId, body.apiToken);
  }

  @Get('connection')
  @ApiOperation({ summary: 'Get the active DNS connection for this project' })
  async getConnection(@Req() req: Request, @Param('projectId') projectId: string) {
    const user = req.user as { userId: string };
    return this.domainsService.getConnection(user.userId, projectId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a domain and clean up DNS records' })
  async delete(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    return this.domainsService.delete(user.userId, projectId, domainId);
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Get the latest health check result for a domain' })
  async getHealth(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    return this.domainsService.getHealth(user.userId, projectId, domainId);
  }

  @Post(':id/health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger a new health check for a domain' })
  async triggerHealthCheck(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    return this.domainsService.triggerHealthCheck(user.userId, projectId, domainId);
  }

  @Get(':id/dns-records')
  @ApiOperation({ summary: 'Get all required DNS records for a domain (deployment + email)' })
  async getDnsRecords(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    return this.domainsService.getDnsRecords(user.userId, projectId, domainId);
  }

  @Post(':id/dns-records/auto-configure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Auto-configure DNS records via Cloudflare (Mode B)' })
  async autoConfigureDnsRecords(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    return this.domainsService.autoConfigureDnsRecords(user.userId, projectId, domainId);
  }

  @Post(':id/email-records/auto-configure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Auto-configure email DNS records (MX, SPF, DKIM, DMARC)' })
  async autoConfigureEmailRecords(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    await this.accessService.ensureAccess(user.userId, projectId);
    const domain = await this.prisma.domain.findFirst({ where: { id: domainId, projectId } });
    if (!domain) throw new NotFoundException('Domain not found');
    return this.emailRecordsService.autoConfigureEmailRecords(domainId);
  }

  @Get(':id/email-records/status')
  @ApiOperation({ summary: 'Check status of email DNS records (MX, SPF, DKIM, DMARC)' })
  async getEmailRecordsStatus(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    await this.accessService.ensureAccess(user.userId, projectId);
    const domain = await this.prisma.domain.findFirst({ where: { id: domainId, projectId } });
    if (!domain) throw new NotFoundException('Domain not found');
    return this.emailRecordsService.checkEmailRecords(domainId);
  }

  @Post(':id/dkim/rotate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate DKIM key for a domain (generates new key + selector)' })
  async rotateDkim(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    await this.accessService.ensureAccess(user.userId, projectId);
    const domain = await this.prisma.domain.findFirst({ where: { id: domainId, projectId } });
    if (!domain) throw new NotFoundException('Domain not found');
    return this.emailKeyService.rotateKey(domainId, domain.domain);
  }

  @Get(':id/ssl')
  @ApiOperation({ summary: 'Get SSL certificate info for a domain' })
  async getSsl(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    return this.domainsService.getSsl(user.userId, projectId, domainId);
  }

  @Post(':id/ssl/renew')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renew SSL certificate for a domain' })
  async renewSsl(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    return this.domainsService.renewSsl(user.userId, projectId, domainId);
  }

  @Post(':id/ssl/reissue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reissue SSL certificate for a domain (force new cert)' })
  async reissueSsl(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    return this.domainsService.reissueSsl(user.userId, projectId, domainId);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get verification run history for a domain' })
  async getHistory(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    await this.accessService.ensureAccess(user.userId, projectId);
    return this.reconciliationService.getVerificationHistory(domainId);
  }

  @Get(':id/incidents')
  @ApiOperation({ summary: 'Get incidents for a domain' })
  async getIncidents(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    await this.accessService.ensureAccess(user.userId, projectId);
    return this.reconciliationService.getIncidents(domainId);
  }

  @Get(':id/health-timeline')
  @ApiOperation({ summary: 'Get health score timeline for a domain' })
  async getHealthTimeline(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') domainId: string,
  ) {
    const user = req.user as { userId: string };
    await this.accessService.ensureAccess(user.userId, projectId);
    return this.reconciliationService.getHealthTimeline(domainId);
  }

  @Get('wizard/:id')
  @ApiOperation({ summary: 'Get DNS Wizard status for a domain — required records, propagation status, and step progress' })
  async getWizardStatus(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    await this.accessService.ensureAccess(user.userId, projectId);
    const status = await this.wizardService.getWizardStatus(domainId);
    if (!status) throw new NotFoundException('Domain not found');
    return status;
  }

  // ── Repair ──────────────────────────────────────────────────────────────────

  @Get(':id/repair-policy')
  @ApiOperation({ summary: 'Get the repair policy for a domain' })
  async getRepairPolicy(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    await this.accessService.ensureAccess(user.userId, projectId);
    return this.repairService.getPolicy(domainId);
  }

  @Patch(':id/repair-policy')
  @ApiOperation({ summary: 'Update the repair policy for a domain — controls which repairs run automatically' })
  async updateRepairPolicy(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') domainId: string,
    @Body() dto: UpdateRepairPolicyDto,
  ) {
    const user = req.user as { userId: string };
    await this.accessService.ensureAccess(user.userId, projectId);
    return this.repairService.updatePolicy(domainId, dto);
  }

  @Get(':id/repairs')
  @ApiOperation({ summary: 'Get recent repair runs for a domain' })
  async listRepairs(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    await this.accessService.ensureAccess(user.userId, projectId);
    return this.repairService.listRepairs(domainId);
  }

  @Get(':id/repair-plan')
  @ApiOperation({ summary: 'Get the repair plan for a domain or incident — shows what would be repaired' })
  async getRepairPlan(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') domainId: string,
  ) {
    const user = req.user as { userId: string };
    await this.accessService.ensureAccess(user.userId, projectId);
    return this.repairService.getRepairPlan(domainId);
  }

  @Post(':id/repair')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger a repair for a domain — queues or executes based on policy' })
  async triggerRepair(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') domainId: string,
    @Body() dto: TriggerRepairDto,
  ) {
    const user = req.user as { userId: string };
    await this.accessService.ensureAccess(user.userId, projectId);
    return this.repairService.triggerRepair(domainId, dto);
  }

  @Get(':id/propagation')
  @ApiOperation({ summary: 'Check DNS propagation across major resolvers' })
  async checkPropagation(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') domainId: string,
    @Query('type') recordType?: string,
    @Query('name') recordName?: string,
    @Query('expected') expectedValue?: string,
  ) {
    const user = req.user as { userId: string };
    await this.accessService.ensureAccess(user.userId, projectId);

    // If specific record provided, check just that one
    if (recordType && recordName && expectedValue) {
      return this.propagationService.checkPropagation(recordName, recordType, expectedValue);
    }

    // Otherwise check all managed records for the domain
    return this.propagationService.checkDomainPropagation(domainId);
  }
}
