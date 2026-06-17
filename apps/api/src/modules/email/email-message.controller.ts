import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailMessageService } from './message.service';
import { SendEmailDto } from './dto/send-email.dto';
import { ListMessagesDto } from './dto/list-messages.dto';
import { MarkMessagesReadDto } from './dto/mark-messages-read.dto';
import { DeleteMessagesDto } from './dto/delete-messages.dto';

@ApiTags('email-messages')
@Controller('projects/:projectId/email')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailMessageController {
  constructor(private messageService: EmailMessageService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send an email (via Stalwart SMTP submission)' })
  sendEmail(@Param('projectId') projectId: string, @Body() dto: SendEmailDto) {
    return this.messageService.sendEmail(projectId, dto);
  }

  @Get('messages')
  @ApiOperation({ summary: 'List messages (supports folder and unread filters)' })
  listMessages(@Param('projectId') projectId: string, @Query() dto: ListMessagesDto) {
    return this.messageService.listMessages(projectId, dto);
  }

  @Get('messages/:messageId')
  @ApiOperation({ summary: 'Get message metadata' })
  getMessage(@Param('projectId') projectId: string, @Param('messageId') messageId: string) {
    return this.messageService.getMessage(projectId, messageId);
  }

  @Patch('messages/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark messages as read/unread' })
  markMessagesRead(@Param('projectId') projectId: string, @Body() dto: MarkMessagesReadDto) {
    return this.messageService.markMessagesRead(projectId, dto);
  }

  @Patch('messages/:messageId/star')
  @ApiOperation({ summary: 'Star or unstar a message' })
  markMessageStarred(
    @Param('projectId') projectId: string,
    @Param('messageId') messageId: string,
    @Query('starred') starred: string,
  ) {
    return this.messageService.markMessageStarred(projectId, messageId, starred === 'true');
  }

  @Delete('messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete message metadata rows' })
  deleteMessages(@Param('projectId') projectId: string, @Body() dto: DeleteMessagesDto) {
    return this.messageService.deleteMessages(projectId, dto);
  }
}
