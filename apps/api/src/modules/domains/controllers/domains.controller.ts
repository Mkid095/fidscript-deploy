import {
  Controller, Get, Post, Delete, Body, Param, UseGuards,
  Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { DomainsService } from '@/modules/domains/services/domains.service';
import { AddDomainDto } from '@/modules/domains/dto/add-domain.dto';
import { Request } from 'express';

@ApiTags('domains')
@Controller('projects/:projectId/domains')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DomainsController {
  constructor(private domainsService: DomainsService) {}

  @Get()
  @ApiOperation({ summary: 'List project domains' })
  async list(@Req() req: Request, @Param('projectId') projectId: string) {
    const user = req.user as { userId: string };
    return this.domainsService.list(user.userId, projectId);
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
}
