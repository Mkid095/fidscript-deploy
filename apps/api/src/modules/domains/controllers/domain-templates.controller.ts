import {
  Controller, Get, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DomainTemplateService } from '@/modules/domains/services/domain-template.service';

/**
 * DomainTemplatesController
 *
 * Provides predefined domain configuration templates.
 * Templates make onboarding fast — users pick a preset (SaaS App, Email Only,
 * Marketing Site, etc.) and all capabilities + DNS records are pre-configured.
 *
 * These endpoints are read-only (no auth required — templates are public).
 */
@ApiTags('domain-templates')
@Controller('api/v1/domain-templates')
export class DomainTemplatesController {
  constructor(private templateService: DomainTemplateService) {}

  /**
   * List all available domain templates.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List domain configuration templates' })
  async listTemplates(
    @Query('category') category?: string,
    @Query('popular') popular?: string,
  ) {
    const templates = await this.templateService.listTemplates({
      category,
      popularOnly: popular === 'true',
    });
    return { templates };
  }

  /**
   * Get a single template by ID.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a domain template by ID' })
  async getTemplate(@Param('id') id: string) {
    return this.templateService.getTemplate(id);
  }

  /**
   * Get the list of template categories.
   */
  @Get('meta/categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List template categories' })
  async getCategories() {
    const categories = await this.templateService.getCategories();
    return { categories };
  }
}
