import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { LogStreamService } from '@/modules/logging/services/log-stream.service';
import { LogEntryService } from '@/modules/logging/services/log-entry.service';
import { CreateLogStreamDto, GetLogsDto, WriteLogDto, WriteBatchLogsDto } from '@/modules/logging/dto/index';

@ApiTags('logging')
@Controller('projects/:projectId/logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoggingController {
  constructor(
    private logStreamService: LogStreamService,
    private logEntryService: LogEntryService,
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
    return this.logEntryService.writeLog(projectId, dto);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Write batch logs' })
  async writeBatchLogs(@Param('projectId') projectId: string, @Body() dto: WriteBatchLogsDto) {
    return this.logEntryService.writeBatchLogs(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get logs' })
  async getLogs(@Param('projectId') projectId: string, @Query() dto: GetLogsDto) {
    return this.logEntryService.getLogs(projectId, dto);
  }

  @Get('streams/:streamName')
  @ApiOperation({ summary: 'Get logs by stream' })
  async getLogsByStream(
    @Param('projectId') projectId: string,
    @Param('streamName') streamName: string,
    @Query() dto: GetLogsDto,
  ) {
    return this.logEntryService.getLogsByStream(projectId, streamName, dto);
  }

  @Get('streams/:streamName/timeline')
  @ApiOperation({ summary: 'Get log timeline' })
  async getLogTimeline(
    @Param('projectId') projectId: string,
    @Param('streamName') streamName: string,
    @Query('interval') interval?: string,
  ) {
    return this.logEntryService.getLogTimeline(projectId, streamName, interval);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get log stats' })
  async getLogStats(@Param('projectId') projectId: string, @Query('stream') stream?: string) {
    return this.logEntryService.getLogStats(projectId, stream);
  }
}
