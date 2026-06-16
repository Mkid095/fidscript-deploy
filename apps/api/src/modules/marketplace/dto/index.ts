export class SubmitMarketplaceItemDto {
  type!: 'skill' | 'template' | 'integration';
  name!: string;
  description?: string;
  category!: string;
  subcategory?: string;
  content?: string;
  website?: string;
  githubUrl?: string;
  npmPackage?: string;
}

export class UpdateMarketplaceItemDto {
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  content?: string;
  website?: string;
  githubUrl?: string;
  npmPackage?: string;
  isActive?: boolean;
}

export class CreateReviewDto {
  rating!: number;
  title?: string;
  content?: string;
}

export class ListMarketplaceDto {
  type?: 'skill' | 'template' | 'integration';
  category?: string;
  search?: string;
  sort?: 'downloads' | 'rating' | 'recent';
  limit?: number;
  offset?: number;
}