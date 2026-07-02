import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

@Injectable()
export class MarketplaceSubmissionService {
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

    this.events.emit('marketplace.item.submitted', null, { itemId: item.id, type: item.type });
    return item;
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

  private requireAdmin(user: { platformRole?: string }): void {
    // Defense-in-depth: service-level role recheck even though guard already validated
    if (user.platformRole !== 'ADMIN') {
      throw new ForbiddenException('Admin role required for this action');
    }
  }

  async approveItem(itemId: string, actor: { platformRole?: string }) {
    this.requireAdmin(actor);
    const item = await this.prisma.marketplaceItem.update({
      where: { id: itemId },
      data: { status: 'approved', approvedAt: new Date(), isActive: true },
    });
    this.events.emit('marketplace.item.approved', null, { itemId: item.id });
    return item;
  }

  async rejectItem(itemId: string, actor: { platformRole?: string }) {
    this.requireAdmin(actor);
    return this.prisma.marketplaceItem.update({
      where: { id: itemId },
      data: { status: 'rejected' },
    });
  }

  async markFeatured(itemId: string, featured: boolean, actor: { platformRole?: string }) {
    this.requireAdmin(actor);
    return this.prisma.marketplaceItem.update({
      where: { id: itemId },
      data: { isFeatured: featured },
    });
  }

  async verifyItem(itemId: string, actor: { platformRole?: string }) {
    this.requireAdmin(actor);
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

  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100) + '-' + Date.now().toString(36);
  }
}
