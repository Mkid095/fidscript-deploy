import { Module } from '@nestjs/common';
import { MarketplaceController } from '@/modules/marketplace/controllers/marketplace.controller';
import { MarketplaceCatalogService } from '@/modules/marketplace/services/marketplace-catalog.service';
import { MarketplaceSubmissionService } from '@/modules/marketplace/services/marketplace-submission.service';
import { MarketplaceReviewService } from '@/modules/marketplace/services/marketplace-review.service';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MarketplaceController],
  providers: [
    MarketplaceCatalogService,
    MarketplaceSubmissionService,
    MarketplaceReviewService,
  ],
  exports: [
    MarketplaceCatalogService,
    MarketplaceSubmissionService,
    MarketplaceReviewService,
  ],
})
export class MarketplaceModule {}
