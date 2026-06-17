import {
  Controller, Get, Post, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailDomainService } from './domain.service';
import { CreateEmailDomainDto } from './dto/create-email-domain.dto';

@ApiTags('email-domains')
@Controller('projects/:projectId/email/domains')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailDomainController {
  constructor(private domainService: EmailDomainService) {}

  @Post()
  @ApiOperation({ summary: 'Add an email domain' })
  createDomain(@Param('projectId') projectId: string, @Body() dto: CreateEmailDomainDto) {
    return this.domainService.createDomain(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List email domains' })
  listDomains(@Param('projectId') projectId: string) {
    return this.domainService.listDomains(projectId);
  }

  @Get(':domainId')
  @ApiOperation({ summary: 'Get email domain' })
  getDomain(@Param('projectId') projectId: string, @Param('domainId') domainId: string) {
    return this.domainService.getDomain(projectId, domainId);
  }

  @Delete(':domainId')
  @ApiOperation({ summary: 'Delete email domain and all its mailboxes' })
  deleteDomain(@Param('projectId') projectId: string, @Param('domainId') domainId: string) {
    return this.domainService.deleteDomain(projectId, domainId);
  }

  @Post(':domainId/verify')
  @ApiOperation({ summary: 'Verify domain ownership and DNS records' })
  verifyDomain(@Param('projectId') projectId: string, @Param('domainId') domainId: string) {
    return this.domainService.verifyDomain(projectId, domainId);
  }
}
