import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { WhatsappService } from './whatsapp.service';

/**
 * The project's WhatsApp.
 *
 * The instances live in the WhatsApp platform; this is the project's door to
 * it — the key it holds, and the instance it owns.
 */
@ApiTags('whatsapp')
@Controller('projects/:projectId/whatsapp')
@UseGuards(ApiKeyOrJwtGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class WhatsappController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Get()
  @ApiOperation({ summary: 'The WhatsApp state of this project' })
  async state(@Req() req: Request, @Param('projectId') projectId: string) {
    const user = req.user as { userId: string };
    return this.whatsapp.state(user.userId, projectId);
  }

  @Post('connect')
  @ApiOperation({ summary: 'Connect the project to the WhatsApp platform' })
  async connect(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Body() body: { apiKey?: string; instanceName?: string },
  ) {
    const user = req.user as { userId: string };
    return this.whatsapp.connect(user.userId, projectId, body.apiKey ?? '', body.instanceName);
  }

  @Delete()
  @ApiOperation({ summary: 'Let the WhatsApp platform go' })
  async disconnect(@Req() req: Request, @Param('projectId') projectId: string) {
    const user = req.user as { userId: string };
    return this.whatsapp.disconnect(user.userId, projectId);
  }
}
