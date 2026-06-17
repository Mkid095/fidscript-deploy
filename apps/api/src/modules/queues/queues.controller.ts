import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QueuesService } from './queues.service';
import {
  CreateQueueDto,
  UpdateQueueDto,
  PublishMessageDto,
  PublishBatchDto,
  ConsumeMessageDto,
  AcknowledgeMessageDto,
  RetryMessageDto,
  MoveToDeadLetterDto,
} from './dto/index';

@ApiTags('queues')
@Controller('projects/:projectId/queues')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QueuesController {
  constructor(private queuesService: QueuesService) {}

  @Post()
  @ApiOperation({ summary: 'Create queue' })
  async createQueue(@Param('projectId') projectId: string, @Body() dto: CreateQueueDto) {
    return this.queuesService.createQueue(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List queues' })
  async listQueues(@Param('projectId') projectId: string) {
    const queues = await this.queuesService.listQueues(projectId);
    return { queues };
  }

  @Get(':queueId')
  @ApiOperation({ summary: 'Get queue' })
  async getQueue(@Param('projectId') projectId: string, @Param('queueId') queueId: string) {
    return this.queuesService.getQueue(projectId, queueId);
  }

  @Patch(':queueId')
  @ApiOperation({ summary: 'Update queue' })
  async updateQueue(
    @Param('projectId') projectId: string,
    @Param('queueId') queueId: string,
    @Body() dto: UpdateQueueDto,
  ) {
    return this.queuesService.updateQueue(projectId, queueId, dto);
  }

  @Delete(':queueId')
  @ApiOperation({ summary: 'Delete queue' })
  async deleteQueue(@Param('projectId') projectId: string, @Param('queueId') queueId: string) {
    return this.queuesService.deleteQueue(projectId, queueId);
  }

  @Get(':queueId/stats')
  @ApiOperation({ summary: 'Get queue stats' })
  async getQueueStats(@Param('projectId') projectId: string, @Param('queueId') queueId: string) {
    return this.queuesService.getQueueStats(projectId, queueId);
  }

  @Post(':queueId/messages')
  @ApiOperation({ summary: 'Publish message' })
  async publishMessage(
    @Param('projectId') projectId: string,
    @Param('queueId') queueId: string,
    @Body() dto: PublishMessageDto,
  ) {
    return this.queuesService.publishMessage(projectId, queueId, dto);
  }

  @Post(':queueId/messages/batch')
  @ApiOperation({ summary: 'Publish batch messages' })
  async publishBatch(
    @Param('projectId') projectId: string,
    @Param('queueId') queueId: string,
    @Body() dto: PublishBatchDto,
  ) {
    return this.queuesService.publishBatch(projectId, queueId, dto);
  }

  @Post(':queueId/consume')
  @ApiOperation({ summary: 'Consume messages' })
  async consumeMessages(
    @Param('projectId') projectId: string,
    @Param('queueId') queueId: string,
    @Body() dto: ConsumeMessageDto,
  ) {
    return this.queuesService.consumeMessages(projectId, queueId, dto);
  }

  @Post(':queueId/ack')
  @ApiOperation({ summary: 'Acknowledge messages' })
  async acknowledgeMessages(
    @Param('projectId') projectId: string,
    @Param('queueId') queueId: string,
    @Body() dto: AcknowledgeMessageDto,
  ) {
    return this.queuesService.acknowledgeMessages(projectId, queueId, dto);
  }

  @Post(':queueId/retry')
  @ApiOperation({ summary: 'Retry messages' })
  async retryMessages(
    @Param('projectId') projectId: string,
    @Param('queueId') queueId: string,
    @Body() dto: RetryMessageDto,
  ) {
    return this.queuesService.retryMessages(projectId, queueId, dto);
  }

  @Post(':queueId/dead-letter')
  @ApiOperation({ summary: 'Move to dead letter queue' })
  async moveToDeadLetter(
    @Param('projectId') projectId: string,
    @Param('queueId') queueId: string,
    @Body() dto: MoveToDeadLetterDto,
  ) {
    return this.queuesService.moveToDeadLetter(projectId, queueId, dto);
  }

  @Get(':queueId/messages')
  @ApiOperation({ summary: 'Get queue messages' })
  async getQueueMessages(
    @Param('projectId') projectId: string,
    @Param('queueId') queueId: string,
    @Query() query: { status?: string; limit?: number; cursor?: string },
  ) {
    return this.queuesService.getQueueMessages(projectId, queueId, query.status, query.limit, query.cursor);
  }
}