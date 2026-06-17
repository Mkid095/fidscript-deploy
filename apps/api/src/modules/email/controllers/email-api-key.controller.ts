import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { EmailApiKeyService } from '@/modules/email/services/api-key.service';
import { CreateEmailApiKeyDto } from '@/modules/email/dto/create-email-api-key.dto';

@ApiTags('email-api-keys')
@Controller('projects/:projectId/email/api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailApiKeyController {
  constructor(private apiKeyService: EmailApiKeyService) {}

  @Post()
  @ApiOperation({ summary: 'Create an API key (key shown only once)' })
  createEmailApiKey(@Param('projectId') projectId: string, @Body() dto: CreateEmailApiKeyDto) {
    return this.apiKeyService.createEmailApiKey(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List API keys (without secrets)' })
  listEmailApiKeys(@Param('projectId') projectId: string) {
    return this.apiKeyService.listEmailApiKeys(projectId);
  }

  @Delete(':apiKeyId')
  @ApiOperation({ summary: 'Delete API key' })
  deleteEmailApiKey(@Param('projectId') projectId: string, @Param('apiKeyId') apiKeyId: string) {
    return this.apiKeyService.deleteEmailApiKey(projectId, apiKeyId);
  }
}
