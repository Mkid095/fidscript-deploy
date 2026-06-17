import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';

@Injectable()
export class MarketplaceService {
  constructor(
    private prisma: PrismaService,
    private events: EventService,
  ) {}

  async submitItem(userId: string | null, userName: string | null, dto: any) {
    const slug = this.generateSlug(dto.name);

    const existing = await this.prisma.marketplaceItem.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException('Item with this name already exists');
    }

    const item = await this.prisma.marketplaceItem.create({
      data: {
        type: dto.type,
        name: dto.name,
        slug,
        description: dto.description,
        category: dto.category,
        subcategory: dto.subcategory,
        content: dto.content,
        metadata: dto.metadata || {},
        authorId: userId,
        authorName: userName,
        website: dto.website,
        githubUrl: dto.githubUrl,
        npmPackage: dto.npmPackage,
        status: 'pending',
      },
    });

    this.events.emit('marketplace.item.submitted', { itemId: item.id, type: item.type });
    return item;
  }

  async listItems(query: any) {
    const where: any = {
      status: 'approved',
      isActive: true,
    };

    if (query.type) where.type = query.type;
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = { downloads: 'desc' };
    if (query.sort === 'rating') orderBy.rating = 'desc';
    if (query.sort === 'recent') orderBy.createdAt = 'desc';

    const [items, total] = await Promise.all([
      this.prisma.marketplaceItem.findMany({
        where,
        orderBy,
        take: query.limit || 20,
        skip: query.offset || 0,
        select: {
          id: true,
          type: true,
          name: true,
          slug: true,
          description: true,
          category: true,
          subcategory: true,
          authorName: true,
          version: true,
          downloads: true,
          rating: true,
          reviewCount: true,
          isFeatured: true,
          isVerified: true,
          createdAt: true,
        },
      }),
      this.prisma.marketplaceItem.count({ where }),
    ]);

    return { items, total, limit: query.limit || 20, offset: query.offset || 0 };
  }

  async getItem(slug: string) {
    const item = await this.prisma.marketplaceItem.findUnique({
      where: { slug, status: 'approved', isActive: true },
      include: {
        reviews: {
          where: { isVerified: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rating: true,
            title: true,
            content: true,
            userName: true,
            helpful: true,
            createdAt: true,
          },
        },
      },
    });

    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async getCategories() {
    const items = await this.prisma.marketplaceItem.groupBy({
      by: ['type', 'category'],
      where: { status: 'approved', isActive: true },
      _count: true,
    });

    const categories: Record<string, Record<string, number>> = {};
    for (const item of items) {
      if (!categories[item.type]) categories[item.type] = {};
      categories[item.type][item.category] = item._count;
    }

    return categories;
  }

  async getFeatured() {
    return this.prisma.marketplaceItem.findMany({
      where: { status: 'approved', isActive: true, isFeatured: true },
      take: 6,
      orderBy: { downloads: 'desc' },
      select: {
        id: true,
        type: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        authorName: true,
        rating: true,
        reviewCount: true,
      },
    });
  }

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

  async getMySubmissions(userId: string) {
    return this.prisma.marketplaceItem.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        name: true,
        slug: true,
        status: true,
        downloads: true,
        rating: true,
        reviewCount: true,
        createdAt: true,
      },
    });
  }

  async approveItem(itemId: string) {
    const item = await this.prisma.marketplaceItem.update({
      where: { id: itemId },
      data: { status: 'approved', approvedAt: new Date(), isActive: true },
    });
    this.events.emit('marketplace.item.approved', { itemId: item.id });
    return item;
  }

  async rejectItem(itemId: string) {
    return this.prisma.marketplaceItem.update({
      where: { id: itemId },
      data: { status: 'rejected' },
    });
  }

  async markFeatured(itemId: string, featured: boolean) {
    return this.prisma.marketplaceItem.update({
      where: { id: itemId },
      data: { isFeatured: featured },
    });
  }

  async verifyItem(itemId: string) {
    return this.prisma.marketplaceItem.update({
      where: { id: itemId },
      data: { isVerified: true },
    });
  }

  async updateItem(itemId: string, dto: any) {
    return this.prisma.marketplaceItem.update({
      where: { id: itemId },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        subcategory: dto.subcategory,
        content: dto.content,
        website: dto.website,
        githubUrl: dto.githubUrl,
        npmPackage: dto.npmPackage,
        isActive: dto.isActive,
      },
    });
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

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100) + '-' + Date.now().toString(36);
  }
}