import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PlatformAdminGuard } from '@/modules/auth/guards/platform-admin.guard';
import { AuditService } from '@/modules/audit/audit.service';
import { QueryAuditEventsDto } from '@/modules/audit/dto/query-audit-events.dto';

@ApiTags('admin/audit')
@Controller('admin/audit')
@UseGuards(PlatformAdminGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Platform audit log — all events with optional filters',
    description:
      'Returns platform events (auth, deployments, domains, databases, etc.) with full actor, IP, and user-agent context. ' +
      'Platform admin only. Supports pagination, date range, actor/resource filters, and full-text metadata search.',
  })
  @ApiResponse({ status: 200, description: 'Paginated audit event list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — platform admin only' })
  async queryAuditEvents(@Query() dto: QueryAuditEventsDto) {
    return this.auditService.queryAuditEvents(dto);
  }
}
