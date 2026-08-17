import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';

import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { LogStreamService } from '@/modules/logging/services/log-stream.service';
import { LogWriteService } from '@/modules/logging/services/log-write.service';
import { LogQueryService } from '@/modules/logging/services/log-query.service';
import { LogTimelineService } from '@/modules/logging/services/log-timeline.service';
import { CreateLogStreamDto, GetLogsDto, WriteLogDto, WriteBatchLogsDto } from '@/modules/logging/dto/index';

@ApiTags('logging')
@Controller('projects/:projectId/logs')
@UseGuards(ApiKeyOrJwtGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class LoggingController {
  constructor(
    private logStreamService: LogStreamService,
    private logWriteService: LogWriteService,
    private logQueryService: LogQueryService,
    private logTimelineService: LogTimelineService,
  ) {}

  // ===== Log Streams =====

  @Post('streams')
  @ApiOperation({ summary: 'Create log stream' })
  async createLogStream(@Param('projectId') projectId: string, @Body() dto: CreateLogStreamDto) {
    return this.logStreamService.createLogStream(projectId, dto);
  }

  @Get('streams')
  @ApiOperation({ summary: 'List log streams' })
  async listLogStreams(@Param('projectId') projectId: string) {
    const streams = await this.logStreamService.listLogStreams(projectId);
    return { streams };
  }

  @Get('streams/:streamId')
  @ApiOperation({ summary: 'Get log stream' })
  async getLogStream(@Param('projectId') projectId: string, @Param('streamId') streamId: string) {
    return this.logStreamService.getLogStream(projectId, streamId);
  }

  @Delete('streams/:streamId')
  @ApiOperation({ summary: 'Delete log stream' })
  async deleteLogStream(@Param('projectId') projectId: string, @Param('streamId') streamId: string) {
    return this.logStreamService.deleteLogStream(projectId, streamId);
  }

  // ===== Log Entries =====

  @Post()
  @ApiOperation({ summary: 'Write log entry' })
  async writeLog(@Param('projectId') projectId: string, @Body() dto: WriteLogDto) {
    return this.logWriteService.writeLog(projectId, dto);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Write batch logs' })
  async writeBatchLogs(@Param('projectId') projectId: string, @Body() dto: WriteBatchLogsDto) {
    return this.logWriteService.writeBatchLogs(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get logs' })
  async getLogs(@Param('projectId') projectId: string, @Query() dto: GetLogsDto) {
    return this.logQueryService.getLogs(projectId, dto);
  }

  @Get('streams/:streamName')
  @ApiOperation({ summary: 'Get logs by stream' })
  async getLogsByStream(
    @Param('projectId') projectId: string,
    @Param('streamName') streamName: string,
    @Query() dto: GetLogsDto,
  ) {
    return this.logQueryService.getLogsByStream(projectId, streamName, dto);
  }

  @Get('streams/:streamName/timeline')
  @ApiOperation({ summary: 'Get log timeline' })
  async getLogTimeline(
    @Param('projectId') projectId: string,
    @Param('streamName') streamName: string,
    @Query('interval') interval?: string,
  ) {
    return this.logTimelineService.getLogTimeline(projectId, streamName, interval);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get log stats' })
  async getLogStats(@Param('projectId') projectId: string, @Query('stream') stream?: string) {
    return this.logQueryService.getLogStats(projectId, stream);
  }

  /**
   * Live-tail SSE endpoint: GET /projects/:id/logs/stream?stream=default&level=info
   *
   * Streams new log entries as Server-Sent Events. Each event's `data` field is a
   * JSON-serialized LogEntry. Polls the database every 1s for new entries written
   * since the last poll (uses an in-memory cursor per connection).
   *
   * This is intentionally lightweight (no Postgres LISTEN/NOTIFY); for higher
   * throughput upgrade to event-bus-driven delivery.
   */
  @Sse('stream')
  @ApiOperation({ summary: 'Live-tail log entries (Server-Sent Events)' })
  streamLogs(
    @Param('projectId') projectId: string,
    @Query('stream') stream?: string,
    @Query('level') level?: string,
  ): Observable<MessageEvent> {
    let cursor: Date | null = null;
    return new Observable<MessageEvent>((subscriber) => {
      const tick = async () => {
        try {
          const entries = await this.logQueryService.getLogs(projectId, {
            stream,
            level,
            startTime: cursor ?? undefined,
            limit: 100,
          });
          if (entries.logs.length > 0) {
            cursor = new Date(entries.logs[entries.logs.length - 1]!.timestamp);
            subscriber.next({ data: entries.logs as unknown as MessageEvent['data'] });
          }
        } catch (err) {
          subscriber.error(err);
        }
      };
      void tick();
      const handle = setInterval(() => { void tick(); }, 1000);
      return () => clearInterval(handle);
    });
  }
}