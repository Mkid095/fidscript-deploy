import {
  Controller,
  Post,
  Headers,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { ProjectApiKeyService } from '@/modules/projects/services/project-api-key.service';
import { LogWriteService } from '@/modules/logging/services/log-write.service';
import { LogQuotaService } from '@/modules/logging/services/log-quota.service';
import { LogShipperService } from '@/modules/logging/services/log-shipper.service';
import { EventService } from '@/modules/events/event.service';
import { IngestLogsDto } from '@/modules/logging/dto/ingest-log.dto';

@ApiTags('logs-ingest')
@Controller('logs')
export class LogIngestController {
  private readonly logger = new Logger(LogIngestController.name);

  constructor(
    private readonly apiKeySvc: ProjectApiKeyService,
    private readonly logWrite: LogWriteService,
    private readonly quota: LogQuotaService,
    private readonly shipper: LogShipperService,
    private readonly events: EventService,
  ) {}

  /**
   * Phase 15 — structured log ingest.
   *
   * Authenticated via `X-API-Key: fpk_...` header (project API key).
   * Accepts structured log entries from deployed apps, functions, queues, etc.
   * Entries are written to the DB, buffered for shipping, and counted toward
   * the soft quota.  Returns ACCEPTED even when some entries are over quota
   * (soft enforcement).
   */
  @Post('ingest')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Ingest structured log entries' })
  @ApiHeader({ name: 'X-API-Key', description: 'Project API key (fpk_...)', required: true })
  async ingestLogs(
    @Headers('x-api-key') rawKey: string,
    @Body() dto: IngestLogsDto,
  ) {
    const validated = await this.apiKeySvc.validateProjectApiKey(rawKey);
    if (!validated) throw new UnauthorizedException('Invalid project API key');

    const { projectId } = validated;
    const results: Array<{ stream: string; level: string; entryId?: string; overQuota?: boolean }> = [];
    let overQuotaCount = 0;

    for (const entry of dto.logs) {
      // Soft quota check
      const withinQuota = await this.quota.checkQuota(projectId, 'default');
      if (!withinQuota) {
        overQuotaCount++;
        results.push({ stream: entry.source, level: entry.level, overQuota: true });
        continue;
      }

      const writeResult = await this.logWrite.writeLog(projectId, {
        stream: entry.source,
        level: entry.level,
        message: entry.message,
        metadata: {
          ...(entry.metadata ?? {}),
          ...(entry.correlationId ? { correlationId: entry.correlationId } : {}),
        },
      });

      // Buffer for shipping
      this.shipper.bufferEntry(projectId, writeResult.entryId, entry.source, {
        id: writeResult.entryId,
        level: entry.level,
        message: entry.message,
        metadata: entry.metadata ?? {},
        timestamp: (entry.timestamp ? new Date(entry.timestamp) : new Date()).toISOString(),
      });

      results.push({ stream: entry.source, level: entry.level, entryId: writeResult.entryId });
    }

    // Sampled ingested event (every 1 % of batches)
    if (dto.logs.length > 0 && Math.random() < 0.01) {
      this.events.emit('logs.log.ingested', projectId, {
        count: dto.logs.length,
        overQuotaCount,
        sampled: true,
      });
    }

    return {
      accepted: results.filter(r => !r.overQuota).length,
      overQuota: overQuotaCount,
      results,
    };
  }
}
