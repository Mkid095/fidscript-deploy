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
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { QueueCrudService } from './services/queue-crud.service';
import { QueueMessagesService } from './services/queue-messages.service';
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
  constructor(
    private queueCrudService: QueueCrudService,
    private queueMessagesService: QueueMessagesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create queue' })
  async createQueue(@Param('projectId') projectId: string, @Body() dto: CreateQueueDto) {
    return this.queueCrudService.createQueue(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List queues' })
  async listQueues(@Param('projectId') projectId: string) {
    const queues = await this.queueCrudService.listQueues(projectId);
    return { queues };
  }

  @Get(':queueId')
  @ApiOperation({ summary: 'Get queue' })
  async getQueue(@Param('projectId') projectId: string, @Param('queueId') queueId: string) {
    return this.queueCrudService.getQueue(projectId, queueId);
  }

  @Patch(':queueId')
  @ApiOperation({ summary: 'Update queue' })
  async updateQueue(
    @Param('projectId') projectId: string,
    @Param('queueId') queueId: string,
    @Body() dto: UpdateQueueDto,
  ) {
    return this.queueCrudService.updateQueue(projectId, queueId, dto);
  }

  @Delete(':queueId')
  @ApiOperation({ summary: 'Delete queue' })
  async deleteQueue(@Param('projectId') projectId: string, @Param('queueId') queueId: string) {
    return this.queueCrudService.deleteQueue(projectId, queueId);
  }

  @Get(':queueId/stats')
  @ApiOperation({ summary: 'Get queue stats' })
  async getQueueStats(@Param('projectId') projectId: string, @Param('queueId') queueId: string) {
    return this.queueMessagesService.getQueueStats(projectId, queueId);
  }

  @Post(':queueId/messages')
  @ApiOperation({ summary: 'Publish message' })
  async publishMessage(
    @Param('projectId') projectId: string,
    @Param('queueId') queueId: string,
    @Body() dto: PublishMessageDto,
  ) {
    return this.queueMessagesService.publishMessage(projectId, queueId, dto);
  }

  @Post(':queueId/messages/batch')
  @ApiOperation({ summary: 'Publish batch messages' })
  async publishBatch(
    @Param('projectId') projectId: string,
    @Param('queueId') queueId: string,
    @Body() dto: PublishBatchDto,
  ) {
    return this.queueMessagesService.publishBatch(projectId, queueId, dto);
  }

  @Post(':queueId/consume')
  @ApiOperation({ summary: 'Consume messages' })
  async consumeMessages(
    @Param('projectId') projectId: string,
    @Param('queueId') queueId: string,
    @Body() dto: ConsumeMessageDto,
  ) {
    return this.queueMessagesService.consumeMessages(projectId, queueId, dto);
  }

  @Post(':queueId/ack')
  @ApiOperation({ summary: 'Acknowledge messages' })
  async acknowledgeMessages(
    @Param('projectId') projectId: string,
    @Param('queueId') queueId: string,
    @Body() dto: AcknowledgeMessageDto,
  ) {
    return this.queueMessagesService.acknowledgeMessages(projectId, queueId, dto);
  }

  @Post(':queueId/retry')
  @ApiOperation({ summary: 'Retry messages' })
  async retryMessages(
    @Param('projectId') projectId: string,
    @Param('queueId') queueId: string,
    @Body() dto: RetryMessageDto,
  ) {
    return this.queueMessagesService.retryMessages(projectId, queueId, dto);
  }

  @Post(':queueId/dead-letter')
  @ApiOperation({ summary: 'Move to dead letter queue' })
  async moveToDeadLetter(
    @Param('projectId') projectId: string,
    @Param('queueId') queueId: string,
    @Body() dto: MoveToDeadLetterDto,
  ) {
    return this.queueMessagesService.moveToDeadLetter(projectId, queueId, dto);
  }

  @Get(':queueId/messages')
  @ApiOperation({ summary: 'Get queue messages' })
  async getQueueMessages(
    @Param('projectId') projectId: string,
    @Param('queueId') queueId: string,
    @Query() query: { status?: string; limit?: number; cursor?: string },
  ) {
    return this.queueMessagesService.getQueueMessages(
      projectId,
      queueId,
      query.status,
      query.limit,
      query.cursor,
    );
  }
}
