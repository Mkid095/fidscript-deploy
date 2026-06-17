import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DatabasesService } from './databases.service';
import {
  CreateDatabaseDto,
  UpdateDatabaseDto,
  CreateBackupDto,
  RestoreBackupDto,
  RotateCredentialsDto,
  GetConnectionInfoDto,
} from './dto/index';

@ApiTags('databases')
@Controller('projects/:projectId/databases')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DatabasesController {
  constructor(private databasesService: DatabasesService) {}

  @Post()
  @ApiOperation({ summary: 'Create database' })
  async createDatabase(@Param('projectId') projectId: string, @Body() dto: CreateDatabaseDto) {
    return this.databasesService.createDatabase(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List databases' })
  async listDatabases(@Param('projectId') projectId: string) {
    const databases = await this.databasesService.listDatabases(projectId);
    return { databases };
  }

  @Get(':databaseId')
  @ApiOperation({ summary: 'Get database' })
  async getDatabase(@Param('projectId') projectId: string, @Param('databaseId') databaseId: string) {
    return this.databasesService.getDatabase(projectId, databaseId);
  }

  @Patch(':databaseId')
  @ApiOperation({ summary: 'Update database' })
  async updateDatabase(
    @Param('projectId') projectId: string,
    @Param('databaseId') databaseId: string,
    @Body() dto: UpdateDatabaseDto,
  ) {
    return this.databasesService.updateDatabase(projectId, databaseId, dto);
  }

  @Delete(':databaseId')
  @ApiOperation({ summary: 'Delete database' })
  async deleteDatabase(@Param('projectId') projectId: string, @Param('databaseId') databaseId: string) {
    return this.databasesService.deleteDatabase(projectId, databaseId);
  }

  @Get(':databaseId/status')
  @ApiOperation({ summary: 'Get database status' })
  async getDatabaseStatus(@Param('projectId') projectId: string, @Param('databaseId') databaseId: string) {
    return this.databasesService.getDatabaseStatus(projectId, databaseId);
  }

  @Get(':databaseId/connection')
  @ApiOperation({ summary: 'Get connection info' })
  async getConnectionInfo(
    @Param('projectId') projectId: string,
    @Param('databaseId') databaseId: string,
    @Query() dto: GetConnectionInfoDto,
  ) {
    return this.databasesService.getConnectionInfo(projectId, databaseId, dto);
  }

  @Post(':databaseId/credentials/rotate')
  @ApiOperation({ summary: 'Rotate credentials' })
  async rotateCredentials(
    @Param('projectId') projectId: string,
    @Param('databaseId') databaseId: string,
    @Body() dto: RotateCredentialsDto,
  ) {
    return this.databasesService.rotateCredentials(projectId, databaseId, dto);
  }

  @Post(':databaseId/backups')
  @ApiOperation({ summary: 'Create backup' })
  async createBackup(
    @Param('projectId') projectId: string,
    @Param('databaseId') databaseId: string,
    @Body() dto: CreateBackupDto,
  ) {
    return this.databasesService.createBackup(projectId, databaseId, dto);
  }

  @Get(':databaseId/backups')
  @ApiOperation({ summary: 'List backups' })
  async listBackups(@Param('projectId') projectId: string, @Param('databaseId') databaseId: string) {
    const backups = await this.databasesService.listBackups(projectId, databaseId);
    return { backups };
  }

  @Post(':databaseId/backups/:backupId/restore')
  @ApiOperation({ summary: 'Restore backup' })
  async restoreBackup(
    @Param('projectId') projectId: string,
    @Param('databaseId') databaseId: string,
    @Body() dto: RestoreBackupDto,
  ) {
    return this.databasesService.restoreBackup(projectId, databaseId, dto);
  }
}