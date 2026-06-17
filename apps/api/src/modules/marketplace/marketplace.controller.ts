import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MarketplaceService } from './marketplace.service';
import {
  SubmitMarketplaceItemDto,
  UpdateMarketplaceItemDto,
  CreateReviewDto,
  ListMarketplaceDto,
} from './dto/index';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private marketplaceService: MarketplaceService) {}

  @Get()
  @ApiOperation({ summary: 'List marketplace items' })
  async listItems(@Query() query: ListMarketplaceDto) {
    return this.marketplaceService.listItems(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured items' })
  async getFeatured() {
    return this.marketplaceService.getFeatured();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get categories' })
  async getCategories() {
    return this.marketplaceService.getCategories();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get marketplace item' })
  async getItem(@Param('slug') slug: string) {
    return this.marketplaceService.getItem(slug);
  }

  @Post(':slug/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create review' })
  async createReview(
    @Param('slug') slug: string,
    @Req() req: any,
    @Body() dto: CreateReviewDto,
  ) {
    return this.marketplaceService.createReview(slug, req.user?.id, req.user?.name, dto);
  }

  @Post(':slug/download')
  @ApiOperation({ summary: 'Record download' })
  async incrementDownloads(@Param('slug') slug: string) {
    return this.marketplaceService.incrementDownloads(slug);
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit item to marketplace' })
  async submitItem(@Req() req: any, @Body() dto: SubmitMarketplaceItemDto) {
    return this.marketplaceService.submitItem(req.user?.id, req.user?.name, dto);
  }

  @Get('my/submissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My submissions' })
  async getMySubmissions(@Req() req: any) {
    return this.marketplaceService.getMySubmissions(req.user?.id);
  }

  @Patch('items/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my item' })
  async updateItem(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateMarketplaceItemDto) {
    return this.marketplaceService.updateItem(id, dto);
  }

  @Post('items/:id/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve item (admin)' })
  async approveItem(@Param('id') id: string) {
    return this.marketplaceService.approveItem(id);
  }

  @Post('items/:id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject item (admin)' })
  async rejectItem(@Param('id') id: string) {
    return this.marketplaceService.rejectItem(id);
  }

  @Post('items/:id/featured')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle featured (admin)' })
  async markFeatured(@Param('id') id: string, @Body() body: { featured: boolean }) {
    return this.marketplaceService.markFeatured(id, body.featured);
  }

  @Post('items/:id/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify item (admin)' })
  async verifyItem(@Param('id') id: string) {
    return this.marketplaceService.verifyItem(id);
  }
}