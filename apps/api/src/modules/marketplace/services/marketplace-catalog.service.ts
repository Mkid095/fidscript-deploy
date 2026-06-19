import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class MarketplaceCatalogService {
  constructor(private prisma: PrismaService) {}

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
          isVerified: false,
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
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rating: true,
            title: true,
            content: true,
            userName: true,
            isVerified: true,
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
}
