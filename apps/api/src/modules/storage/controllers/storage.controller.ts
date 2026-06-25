import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { StorageService } from '@/modules/storage/services/storage.service';
import { Request } from 'express';

@ApiTags('storage')
@Controller('projects/:projectId/storage')
@UseGuards(ApiKeyOrJwtGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(private storageService: StorageService) {}

  // ── Buckets ──────────────────────────────────────────────

  @Post('buckets')
  @ApiOperation({ summary: 'Create a storage bucket (internal/cloudinary/telegram)' })
  async createBucket(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Body() body: { name: string; isPublic?: boolean; provider?: string },
  ) {
    const user = req.user as { userId: string };
    return this.storageService.createBucket(
      user.userId, projectId, body.name, body.isPublic, body.provider ?? 'internal',
    );
  }

  @Get('buckets')
  @ApiOperation({ summary: 'List storage buckets' })
  async listBuckets(@Req() req: Request, @Param('projectId') projectId: string) {
    const user = req.user as { userId: string };
    const buckets = await this.storageService.listBuckets(user.userId, projectId);
    return { buckets };
  }

  @Delete('buckets/:bucketId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a storage bucket (must be empty)' })
  async deleteBucket(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('bucketId') bucketId: string,
  ) {
    const user = req.user as { userId: string };
    return this.storageService.deleteBucket(user.userId, projectId, bucketId);
  }

  // ── Files ────────────────────────────────────────────────

  @Get('buckets/:bucketId/files')
  @ApiOperation({ summary: 'List files in bucket' })
  async listFiles(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('bucketId') bucketId: string,
    @Query('prefix') prefix?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = req.user as { userId: string };
    return this.storageService.listFiles(
      user.userId, projectId, bucketId,
      prefix,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Post('buckets/:bucketId/files')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload a file (multipart/form-data)' })
  async uploadFile(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('bucketId') bucketId: string,
    @Body() body: { key?: string; originalName?: string; mimeType?: string },
  ) {
    const user = req.user as { userId: string };
    // Body contains base64-encoded file data: { data: "<base64>", key: "...", originalName: "...", mimeType: "..." }
    const payload = body as { data?: string; key?: string; originalName?: string; mimeType?: string };
    const data = Buffer.from(payload.data || '', 'base64');
    const key = payload.key || `file-${Date.now()}`;
    return this.storageService.uploadFile(
      user.userId, projectId, bucketId,
      key,
      body.originalName || key,
      body.mimeType || 'application/octet-stream',
      data,
    );
  }

  @Delete('buckets/:bucketId/files/:fileId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a file' })
  async deleteFile(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('bucketId') _bucketId: string,
    @Param('fileId') fileId: string,
  ) {
    const user = req.user as { userId: string };
    return this.storageService.deleteFile(user.userId, projectId, fileId);
  }

  // ── URLs ────────────────────────────────────────────────

  @Post('buckets/:bucketId/presign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a presigned URL for upload/download' })
  async getPresignedUrl(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('bucketId') bucketId: string,
    @Body() body: { key: string; expiresIn?: number },
  ) {
    const user = req.user as { userId: string };
    const url = await this.storageService.getPresignedUrl(
      user.userId, projectId, bucketId, body.key, body.expiresIn,
    );
    return { url };
  }

  @Get('buckets/:bucketId/public-url')
  @ApiOperation({ summary: 'Get public URL for a file (internal provider only)' })
  async getPublicUrl(
    @Param('projectId') projectId: string,
    @Param('bucketId') bucketId: string,
    @Query('key') key: string,
  ) {
    const project = await this.storageService.getProjectSlug(projectId);
    const bucketName = await this.storageService.getBucketName(bucketId);
    const url = this.storageService.getPublicUrl(project, bucketName, key);
    return { url };
  }
}
