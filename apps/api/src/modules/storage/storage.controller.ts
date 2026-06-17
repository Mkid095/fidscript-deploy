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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from './storage.service';
import { Request } from 'express';

@ApiTags('storage')
@Controller('projects/:projectId/storage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Post('buckets')
  @ApiOperation({ summary: 'Create a storage bucket' })
  async createBucket(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Body() body: { name: string; isPublic?: boolean },
  ) {
    const user = req.user as { userId: string };
    return this.storageService.createBucket(user.userId, projectId, body.name, body.isPublic);
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
  @ApiOperation({ summary: 'Delete a storage bucket' })
  async deleteBucket(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('bucketId') bucketId: string,
  ) {
    const user = req.user as { userId: string };
    return this.storageService.deleteBucket(user.userId, bucketId);
  }

  @Get('buckets/:bucketId/files')
  @ApiOperation({ summary: 'List files in bucket' })
  async listFiles(
    @Req() req: Request,
    @Param('bucketId') bucketId: string,
    @Query('prefix') prefix?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = req.user as { userId: string };
    return this.storageService.listFiles(
      user.userId,
      bucketId,
      prefix,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Delete('buckets/:bucketId/files/:fileId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a file' })
  async deleteFile(
    @Req() req: Request,
    @Param('fileId') fileId: string,
  ) {
    const user = req.user as { userId: string };
    return this.storageService.deleteFile(user.userId, fileId);
  }

  @Post('buckets/:bucketId/generate-url')
  @ApiOperation({ summary: 'Generate signed URL' })
  async generateUrl(
    @Param('bucketId') bucketId: string,
    @Body() body: { key: string; expiresIn?: number },
  ) {
    const url = await this.storageService.getSignedUrl(bucketId, body.key, body.expiresIn);
    return { url };
  }
}
