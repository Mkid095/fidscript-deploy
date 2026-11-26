/**
 * Platform-admin backup endpoints.
 *
 * The platform's own disaster-recovery surface: where the backups live,
 * whether the newest one actually restores, and the hands on both.
 *
 *  - GET  ''                 status — destination, last backup, last check
 *  - POST 'run'              run a backup now
 *  - POST 'verify-restore'  prove the newest backup restores
 *  - POST 'destination'      point the backups at an S3-compatible store
 *  - POST 'destination/test' probe a destination without saving it
 *  - DELETE 'destination'    back to the platform's own MinIO
 *
 * Auth: platform admins only, the same guard the mail console uses.
 */
import {
  Controller, Get, Post, Delete, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { PlatformAdminGuard } from '@/modules/auth/guards/platform-admin.guard';
import { Roles } from '@/modules/auth/guards/roles.decorator';
import { Role } from '@prisma/client';
import { PlatformBackupService, S3DestinationConfig } from '@/modules/infrastructure/services/platform-backup.service';

@ApiTags('admin-platform-backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Roles(Role.ADMIN, Role.OWNER)
@Controller('admin/platform-backup')
export class PlatformBackupAdminController {
  constructor(private backup: PlatformBackupService) {}

  /** Where the backups go, what the last one was, and whether it still restores. */
  @Get()
  @HttpCode(HttpStatus.OK)
  status() {
    return this.backup.getBackupStatus();
  }

  /** Run a backup now. 202: the work is accepted, not yet done. */
  @Post('run')
  @HttpCode(HttpStatus.ACCEPTED)
  run() {
    return this.backup.runBackup();
  }

  /** Prove the newest backup restores into a scratch database and counts. */
  @Post('verify-restore')
  @HttpCode(HttpStatus.OK)
  verifyRestore() {
    return this.backup.verifyLatestBackup();
  }

  /** The last twenty restore checks, newest first. */
  @Get('events')
  @HttpCode(HttpStatus.OK)
  events() {
    return this.backup.listVerifyEvents();
  }

  /** Point the backups at an S3-compatible destination. Saved only if it answers. */
  @Post('destination')
  @HttpCode(HttpStatus.OK)
  setDestination(@Body() body: S3DestinationConfig) {
    return this.backup.setDestination(body);
  }

  /** Probe a destination without saving it — the console's "Test" button. */
  @Post('destination/test')
  @HttpCode(HttpStatus.OK)
  testDestination(@Body() body: S3DestinationConfig) {
    return this.backup.testDestination(body);
  }

  /** Drop the configured destination; backups go to the platform's MinIO again. */
  @Delete('destination')
  @HttpCode(HttpStatus.OK)
  clearDestination() {
    return this.backup.clearDestination();
  }
}
