import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { ProjectAccessService } from '@/modules/projects/services/project-access.service';
import { DatabasesService } from '@/modules/databases/services/databases.service';
import {
  CreateDatabaseDto, UpdateDatabaseDto, CreateBackupDto,
  RestoreBackupDto, RotateCredentialsDto, GetConnectionInfoDto,
} from '@/modules/databases/dto/index';
import { Request } from 'express';

@ApiTags('databases')
@Controller('projects/:projectId/databases')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DatabasesController {
  constructor(
    private databasesService: DatabasesService,
    private projectAccess: ProjectAccessService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create database' })
  async createDatabase(
    @Param('projectId') projectId: string,
    @Body() dto: CreateDatabaseDto,
    @CurrentUser() user: any,
  ) {
    await this.projectAccess.findProjectWithAccess(user.userId, projectId);
    return this.databasesService.createDatabase(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List databases' })
  async listDatabases(@Param('projectId') projectId: string, @CurrentUser() user: any) {
    await this.projectAccess.findProjectWithAccess(user.userId, projectId);
    const databases = await this.databasesService.listDatabases(projectId);
    return { databases };
  }

  @Get(':databaseId')
  @ApiOperation({ summary: 'Get database' })
  async getDatabase(
    @Param('projectId') projectId: string,
    @Param('databaseId') databaseId: string,
    @CurrentUser() user: any,
  ) {
    await this.projectAccess.findProjectWithAccess(user.userId, projectId);
    return this.databasesService.getDatabase(projectId, databaseId);
  }

  @Patch(':databaseId')
  @ApiOperation({ summary: 'Update database' })
  async updateDatabase(
    @Param('projectId') projectId: string,
    @Param('databaseId') databaseId: string,
    @Body() dto: UpdateDatabaseDto,
    @CurrentUser() user: any,
  ) {
    await this.projectAccess.findProjectWithAccess(user.userId, projectId);
    return this.databasesService.updateDatabase(projectId, databaseId, dto);
  }

  @Delete(':databaseId')
  @ApiOperation({ summary: 'Delete database' })
  async deleteDatabase(
    @Param('projectId') projectId: string,
    @Param('databaseId') databaseId: string,
    @CurrentUser() user: any,
  ) {
    await this.projectAccess.findProjectWithAccess(user.userId, projectId);
    return this.databasesService.deleteDatabase(projectId, databaseId);
  }

  @Get(':databaseId/status')
  @ApiOperation({ summary: 'Get database status' })
  async getDatabaseStatus(
    @Param('projectId') projectId: string,
    @Param('databaseId') databaseId: string,
    @CurrentUser() user: any,
  ) {
    await this.projectAccess.findProjectWithAccess(user.userId, projectId);
    return this.databasesService.getDatabaseStatus(projectId, databaseId);
  }

  @Get(':databaseId/connection')
  @ApiOperation({ summary: 'Get connection info' })
  async getConnectionInfo(
    @Param('projectId') projectId: string,
    @Param('databaseId') databaseId: string,
    @Query() dto: GetConnectionInfoDto,
    @CurrentUser() user: any,
  ) {
    await this.projectAccess.findProjectWithAccess(user.userId, projectId);
    return this.databasesService.getConnectionInfo(projectId, databaseId, dto);
  }

  @Post(':databaseId/credentials/rotate')
  @ApiOperation({ summary: 'Rotate credentials' })
  async rotateCredentials(
    @Param('projectId') projectId: string,
    @Param('databaseId') databaseId: string,
    @Body() dto: RotateCredentialsDto,
    @CurrentUser() user: any,
  ) {
    await this.projectAccess.findProjectWithAccess(user.userId, projectId);
    return this.databasesService.rotateCredentials(projectId, databaseId);
  }

  @Post(':databaseId/backups')
  @ApiOperation({ summary: 'Create backup' })
  async createBackup(
    @Param('projectId') projectId: string,
    @Param('databaseId') databaseId: string,
    @Body() dto: CreateBackupDto,
    @CurrentUser() user: any,
  ) {
    await this.projectAccess.findProjectWithAccess(user.userId, projectId);
    return this.databasesService.createBackup(projectId, databaseId, dto);
  }

  @Get(':databaseId/backups')
  @ApiOperation({ summary: 'List backups' })
  async listBackups(
    @Param('projectId') projectId: string,
    @Param('databaseId') databaseId: string,
    @CurrentUser() user: any,
  ) {
    await this.projectAccess.findProjectWithAccess(user.userId, projectId);
    const backups = await this.databasesService.listBackups(projectId, databaseId);
    return { backups };
  }

  @Post(':databaseId/backups/:backupId/restore')
  @ApiOperation({ summary: 'Restore backup' })
  async restoreBackup(
    @Param('projectId') projectId: string,
    @Param('databaseId') databaseId: string,
    @Body() dto: RestoreBackupDto,
    @CurrentUser() user: any,
  ) {
    await this.projectAccess.findProjectWithAccess(user.userId, projectId);
    return this.databasesService.restoreBackup(projectId, databaseId, dto);
  }
}
