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

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a domain and clean up DNS records' })
  async delete(@Req() req: Request, @Param('projectId') projectId: string, @Param('id') domainId: string) {
    const user = req.user as { userId: string };
    return this.domainsService.delete(user.userId, projectId, domainId);
  }
}
