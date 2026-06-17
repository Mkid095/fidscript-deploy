import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { QueuesService } from '@/modules/queues/queues.service';
import {
  CreateQueueDto, UpdateQueueDto, PublishMessageDto, PublishBatchDto,
  ConsumeMessageDto, AcknowledgeMessageDto, RetryMessageDto, MoveToDeadLetterDto,
} from '@/modules/queues/dto/index';

@ApiTags('queues')
@Controller('projects/:projectId/queues')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QueuesController {
  constructor(private queues: QueuesService) {}

  @Post()
  async createQueue(@Param('projectId') p: string, @Body() dto: CreateQueueDto) { return this.queues.createQueue(p, dto); }

  @Get()
  async listQueues(@Param('projectId') p: string) { const result = await this.queues.listQueues(p); return { queues: result }; }

  @Get(':queueId')
  async getQueue(@Param('projectId') p: string, @Param('queueId') q: string) { return this.queues.getQueue(p, q); }

  @Patch(':queueId')
  async updateQueue(@Param('projectId') p: string, @Param('queueId') q: string, @Body() dto: UpdateQueueDto) { return this.queues.updateQueue(p, q, dto); }

  @Delete(':queueId')
  async deleteQueue(@Param('projectId') p: string, @Param('queueId') q: string) { return this.queues.deleteQueue(p, q); }

  @Get(':queueId/stats')
  async getQueueStats(@Param('projectId') p: string, @Param('queueId') q: string) { return this.queues.getQueueStats(p, q); }

  @Post(':queueId/messages')
  async publishMessage(@Param('projectId') p: string, @Param('queueId') q: string, @Body() dto: PublishMessageDto) { return this.queues.publishMessage(p, q, dto); }

  @Post(':queueId/messages/batch')
  async publishBatch(@Param('projectId') p: string, @Param('queueId') q: string, @Body() dto: PublishBatchDto) { return this.queues.publishBatch(p, q, dto); }

  @Post(':queueId/consume')
  async consumeMessages(@Param('projectId') p: string, @Param('queueId') q: string, @Body() dto: ConsumeMessageDto) { return this.queues.consumeMessages(p, q, dto); }

  @Post(':queueId/ack')
  async acknowledgeMessages(@Param('projectId') p: string, @Param('queueId') q: string, @Body() dto: AcknowledgeMessageDto) { return this.queues.acknowledgeMessages(p, q, dto); }

  @Post(':queueId/retry')
  async retryMessages(@Param('projectId') p: string, @Param('queueId') q: string, @Body() dto: RetryMessageDto) { return this.queues.retryMessages(p, q, dto); }

  @Post(':queueId/dead-letter')
  async moveToDeadLetter(@Param('projectId') p: string, @Param('queueId') q: string, @Body() dto: MoveToDeadLetterDto) { return this.queues.moveToDeadLetter(p, q, dto); }

  @Get(':queueId/messages')
  async getQueueMessages(
    @Param('projectId') p: string,
    @Param('queueId') q: string,
    @Query() query: { status?: string; limit?: number; cursor?: string },
  ) { return this.queues.getQueueMessages(p, q, query); }
}
