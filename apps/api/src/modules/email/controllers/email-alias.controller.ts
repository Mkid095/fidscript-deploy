import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { EmailAliasService } from '@/modules/email/services/alias.service';
import { CreateAliasDto } from '@/modules/email/dto/create-alias.dto';
import { UpdateAliasDto } from '@/modules/email/dto/update-alias.dto';

@ApiTags('email-aliases')
@Controller('projects/:projectId/email/aliases')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailAliasController {
  constructor(private aliasService: EmailAliasService) {}

  @Post()
  @ApiOperation({ summary: 'Create an alias (forwarding address)' })
  createAlias(@Param('projectId') projectId: string, @Body() dto: CreateAliasDto) {
    return this.aliasService.createAlias(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all aliases' })
  listAliases(@Param('projectId') projectId: string, @Query('domainId') domainId?: string) {
    return this.aliasService.listAliases(projectId, domainId);
  }

  @Patch(':aliasId')
  @ApiOperation({ summary: 'Update alias (targets, active status)' })
  updateAlias(
    @Param('projectId') projectId: string,
    @Param('aliasId') aliasId: string,
    @Body() dto: UpdateAliasDto,
  ) {
    return this.aliasService.updateAlias(projectId, aliasId, dto);
  }

  @Delete(':aliasId')
  @ApiOperation({ summary: 'Delete alias' })
  deleteAlias(@Param('projectId') projectId: string, @Param('aliasId') aliasId: string) {
    return this.aliasService.deleteAlias(projectId, aliasId);
  }
}
