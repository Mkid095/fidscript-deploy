import { Controller, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailInboundService } from './inbound.service';

@ApiTags('email-catch-all')
@Controller('projects/:projectId/email/domains')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailCatchAllController {
  constructor(private inboundService: EmailInboundService) {}

  @Post(':domainId/catch-all')
  @ApiOperation({ summary: 'Set or update the catch-all rule for a domain' })
  setCatchAll(
    @Param('projectId') projectId: string,
    @Param('domainId') domainId: string,
    @Body() dto: { targetType: 'mailbox' | 'external'; targetId?: string; targetAddress?: string },
  ) {
    return this.inboundService.setCatchAll(projectId, domainId, dto);
  }

  @Delete(':domainId/catch-all')
  @ApiOperation({ summary: 'Delete catch-all rule for a domain' })
  deleteCatchAll(@Param('projectId') projectId: string, @Param('domainId') domainId: string) {
    return this.inboundService.deleteCatchAll(projectId, domainId);
  }
}
