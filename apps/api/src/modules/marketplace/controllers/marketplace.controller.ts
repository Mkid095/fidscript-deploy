import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { PlatformAdminGuard } from '@/modules/auth/guards/platform-admin.guard';
import { MarketplaceCatalogService } from '@/modules/marketplace/services/marketplace-catalog.service';
import { MarketplaceReviewService } from '@/modules/marketplace/services/marketplace-review.service';
import { MarketplaceSubmissionService } from '@/modules/marketplace/services/marketplace-submission.service';
import {
  SubmitMarketplaceItemDto,
  UpdateMarketplaceItemDto,
  CreateReviewDto,
  ListMarketplaceDto,
} from '@/modules/marketplace/dto/index';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private catalog: MarketplaceCatalogService,
    private reviews: MarketplaceReviewService,
    private submissions: MarketplaceSubmissionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List marketplace items' })
  async listItems(@Query() query: ListMarketplaceDto) {
    return this.catalog.listItems(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured items' })
  async getFeatured() {
    return this.catalog.getFeatured();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get categories' })
  async getCategories() {
    return this.catalog.getCategories();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get marketplace item' })
  async getItem(@Param('slug') slug: string) {
    return this.catalog.getItem(slug);
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
    return this.reviews.createReview(slug, req.user?.id, req.user?.name, dto);
  }

  @Post(':slug/download')
  @ApiOperation({ summary: 'Record download' })
  async incrementDownloads(@Param('slug') slug: string) {
    return this.reviews.incrementDownloads(slug);
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit item to marketplace' })
  async submitItem(@Req() req: any, @Body() dto: SubmitMarketplaceItemDto) {
    return this.submissions.submitItem(req.user?.id, req.user?.name, dto);
  }

  @Get('my/submissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My submissions' })
  async getMySubmissions(@Req() req: any) {
    return this.submissions.getMySubmissions(req.user?.id);
  }

  @Patch('items/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my item' })
  async updateItem(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateMarketplaceItemDto) {
    return this.submissions.updateItem(id, dto);
  }

  @Post('items/:id/approve')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve item (admin)' })
  async approveItem(@Param('id') id: string, @Req() req: any) {
    return this.submissions.approveItem(id, req.user);
  }

  @Post('items/:id/reject')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject item (admin)' })
  async rejectItem(@Param('id') id: string, @Req() req: any) {
    return this.submissions.rejectItem(id, req.user);
  }

  @Post('items/:id/featured')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle featured (admin)' })
  async markFeatured(@Param('id') id: string, @Body() body: { featured: boolean }, @Req() req: any) {
    return this.submissions.markFeatured(id, body.featured, req.user);
  }

  @Post('items/:id/verify')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify item (admin)' })
  async verifyItem(@Param('id') id: string, @Req() req: any) {
    return this.submissions.verifyItem(id, req.user);
  }
}
