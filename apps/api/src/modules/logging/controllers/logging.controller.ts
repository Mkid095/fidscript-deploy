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
import { LogWriteService } from '@/modules/logging/services/log-write.service';
import { LogQueryService } from '@/modules/logging/services/log-query.service';
import { CreateLogStreamDto, GetLogsDto, WriteLogDto, WriteBatchLogsDto } from '@/modules/logging/dto/index';

@ApiTags('logging')
@Controller('projects/:projectId/logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoggingController {
  constructor(
    private logStreamService: LogStreamService,
    private logWriteService: LogWriteService,
    private logQueryService: LogQueryService,
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
    return this.logQueryService.getLogTimeline(projectId, streamName, interval);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get log stats' })
  async getLogStats(@Param('projectId') projectId: string, @Query('stream') stream?: string) {
    return this.logQueryService.getLogStats(projectId, stream);
  }
}