import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto, GenerateProjectDto } from './dto/index';

@ApiTags('templates')
@Controller('projects/:projectId/templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create template' })
  async createTemplate(@Param('projectId') projectId: string, @Body() dto: CreateTemplateDto) {
    return this.templatesService.createTemplate(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List templates' })
  async listTemplates(@Param('projectId') projectId: string, @Query('category') category?: string) {
    return this.templatesService.listTemplates(projectId, category);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List template categories' })
  async listCategories() {
    return this.templatesService.listCategories();
  }

  @Get(':templateId')
  @ApiOperation({ summary: 'Get template' })
  async getTemplate(@Param('projectId') projectId: string, @Param('templateId') templateId: string) {
    return this.templatesService.getTemplate(projectId, templateId);
  }

  @Patch(':templateId')
  @ApiOperation({ summary: 'Update template' })
  async updateTemplate(
    @Param('projectId') projectId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.updateTemplate(projectId, templateId, dto);
  }

  @Delete(':templateId')
  @ApiOperation({ summary: 'Delete template' })
  async deleteTemplate(@Param('projectId') projectId: string, @Param('templateId') templateId: string) {
    return this.templatesService.deleteTemplate(projectId, templateId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate project from template' })
  async generateProject(@Param('projectId') projectId: string, @Body() dto: GenerateProjectDto) {
    return this.templatesService.generateProject(projectId, dto);
  }
}