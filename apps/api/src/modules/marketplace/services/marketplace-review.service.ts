import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

@Injectable()
export class MarketplaceReviewService {
  constructor(
    private prisma: PrismaService,
    private events: EventService,
  ) {}

  async createReview(itemSlug: string, userId: string | null, userName: string | null, dto: any) {
    const item = await this.prisma.marketplaceItem.findUnique({
      where: { slug: itemSlug, status: 'approved', isActive: true },
    });
    if (!item) throw new NotFoundException('Item not found');

    const existing = await this.prisma.marketplaceReview.findFirst({
      where: { itemId: item.id, userId },
    });
    if (existing) throw new BadRequestException('You already reviewed this item');

    const review = await this.prisma.marketplaceReview.create({
      data: {
        itemId: item.id,
        userId,
        userName,
        rating: dto.rating,
        title: dto.title,
        content: dto.content,
        isVerified: false,
      },
    });

    await this.updateItemRating(item.id);

    this.events.emit('marketplace.review.created', { itemId: item.id, reviewId: review.id });
    return review;
  }

  async incrementDownloads(slug: string) {
    const item = await this.prisma.marketplaceItem.findUnique({ where: { slug } });
    if (item) {
      await this.prisma.marketplaceItem.update({
        where: { id: item.id },
        data: { downloads: { increment: 1 } },
      });
    }
    return { success: true };
  }

  private async updateItemRating(itemId: string) {
    const reviews = await this.prisma.marketplaceReview.findMany({
      where: { itemId },
      select: { rating: true },
    });

    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await this.prisma.marketplaceItem.update({
        where: { id: itemId },
        data: { rating: avgRating, reviewCount: reviews.length },
      });
    }
  }
}
