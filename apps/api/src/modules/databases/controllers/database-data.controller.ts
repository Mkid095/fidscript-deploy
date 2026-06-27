/**
 * DatabaseDataController — database-centric routes for the new BAAS API.
 *
 * Mounted at `@Controller('databases/:databaseId')` (NOT project-scoped) so
 * SDK/dashboard code can address a database by its ID after provisioning.
 * The projectId is resolved from the database row for authorization.
 *
 * Routes:
 *   GET    /databases/:id
 *   GET    /databases/:id/status
 *   GET    /databases/:id/connection
 *   POST   /databases/:id/credentials/rotate
 *
 *   GET    /databases/:id/schema
 *   GET    /databases/:id/tables
 *   GET    /databases/:id/tables/:table/columns
 *   GET    /databases/:id/tables/:table/rows
 *   POST   /databases/:id/tables/:table/rows
 *   DELETE /databases/:id/tables/:table/rows
 *
 *   POST   /databases/:id/query
 *
 *   GET    /databases/:id/migrations
 *   POST   /databases/:id/migrations/apply
 *
 *   GET    /databases/:id/realtime
 *   POST   /databases/:id/tables/:table/realtime/enable
 *   POST   /databases/:id/tables/:table/realtime/disable
 */
import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req,
  NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { Request } from 'express';
import { PrismaService } from '@/prisma/prisma.service';
import { DbSchemaService } from '../services/db-schema.service';
import { DbQueryService } from '../services/db-query.service';
import { DbDataService } from '../services/db-data.service';
import { DbRealtimeService } from '../services/db-realtime.service';
import { DbMigrationService } from '../services/db-migration.service';
import { DbPoolService } from '../services/db-pool.service';
import { SchemaCacheService } from '../services/schema-cache.service';
import { DbCredentialsService } from '../services/db-credentials.service';

@ApiTags('databases')
@Controller('databases/:databaseId')
@UseGuards(ApiKeyOrJwtGuard)
@ApiBearerAuth()
export class DatabaseDataController {
  constructor(
    private prisma: PrismaService,
    private schema: DbSchemaService,
    private queries: DbQueryService,
    private data: DbDataService,
    private realtime: DbRealtimeService,
    private migrations: DbMigrationService,
    private pools: DbPoolService,
    private cache: SchemaCacheService,
    private credentials: DbCredentialsService,
  ) {}

  // ── Authorization ───────────────────────────────────────────────────────

  /**
   * Resolve the database and verify the caller may access it.
   * - API key (X-API-Key): authorized iff the key's project owns the database.
   * - JWT: the project owner or a project member.
   */
  private async authorize(
    databaseId: string,
    user: { userId: string; projectId?: string; isApiKey?: boolean },
  ) {
    const db = await this.prisma.managedDatabase.findUnique({
      where: { id: databaseId },
      include: { project: true },
    });
    if (!db) throw new NotFoundException('Database not found');

    // BaaS path: a project API key grants access to that project's databases.
    if (user.isApiKey) {
      if (user.projectId && user.projectId === db.projectId) return db;
      throw new ForbiddenException('Access denied');
    }

    if (db.project.ownerId === user.userId) return db;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: db.projectId, userId: user.userId } },
    });
    if (!member) throw new ForbiddenException('Access denied');
    return db;
  }

  // ── Database metadata ────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get database details' })
  async get(@Req() req: Request, @Param('databaseId') databaseId: string) {
    const user = (req.user as any);
    const db = await this.authorize(databaseId, user);
    return {
      id: db.id,
      projectId: db.projectId,
      environment: db.environment,
      name: db.name,
      type: db.type,
      version: db.version,
      size: db.size,
      usedBytes: Number(db.usedBytes),
      maxConnections: db.maxConnections,
      status: db.status,
      backupRetentionDays: db.backupRetentionDays,
      createdAt: db.createdAt,
      updatedAt: db.updatedAt,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get database health status' })
  async status(@Req() req: Request, @Param('databaseId') databaseId: string) {
    await this.authorize(databaseId, (req.user as any));
    const isHealthy = await this.pools.healthCheck(databaseId);
    return { status: isHealthy ? 'healthy' : 'unhealthy' };
  }

  @Get('connection')
  @ApiOperation({ summary: 'Get database connection info' })
  async connection(@Req() req: Request, @Param('databaseId') databaseId: string) {
    const user = (req.user as any);
    const db = await this.authorize(databaseId, user);
    return this.credentials.getConnectionInfo(db.projectId, databaseId, { poolOnly: false });
  }

  @Post('credentials/rotate')
  @ApiOperation({ summary: 'Rotate database password' })
  async rotate(@Req() req: Request, @Param('databaseId') databaseId: string) {
    const user = (req.user as any);
    const db = await this.authorize(databaseId, user);
    return this.credentials.rotateCredentials(db.projectId, databaseId);
  }

  // ── Schema introspection ────────────────────────────────────────────────

  @Get('schema')
  @ApiOperation({ summary: 'List all schemas + tables (compact)' })
  async getSchema(@Req() req: Request, @Param('databaseId') databaseId: string) {
    await this.authorize(databaseId, (req.user as any));
    const cached = this.cache.get<any[]>(databaseId, 'schema');
    if (cached) return cached;
    const tables = await this.schema.listTables(databaseId);
    this.cache.set(databaseId, 'schema', tables);
    return tables;
  }

  @Get('tables')
  @ApiOperation({ summary: 'List tables + views' })
  async listTables(@Req() req: Request, @Param('databaseId') databaseId: string) {
    await this.authorize(databaseId, (req.user as any));
    const cached = this.cache.get<any[]>(databaseId, 'tables');
    if (cached) return cached;
    const tables = await this.schema.listTables(databaseId);
    this.cache.set(databaseId, 'tables', tables);
    return tables;
  }

  @Get('tables/:table/columns')
  @ApiOperation({ summary: 'Get column metadata for a table' })
  async getColumns(
    @Req() req: Request,
    @Param('databaseId') databaseId: string,
    @Param('table') table: string,
    @Query('schema') schemaName = 'public',
  ) {
    await this.authorize(databaseId, (req.user as any));
    const key = `columns:${schemaName}:${table}`;
    const cached = this.cache.get<any[]>(databaseId, key);
    if (cached) return cached;
    const cols = await this.schema.getColumns(databaseId, schemaName, table);
    this.cache.set(databaseId, key, cols);
    return cols;
  }

  // ── Data CRUD ───────────────────────────────────────────────────────────

  @Get('tables/:table/rows')
  @ApiOperation({ summary: 'List rows from a table (paginated)' })
  async listRows(
    @Req() req: Request,
    @Param('databaseId') databaseId: string,
    @Param('table') table: string,
    @Query('schema') schemaName = 'public',
    @Query('columns') columns?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('orderBy') orderBy?: string,
    @Query('order') order?: string,
    @Query('where') whereJson?: string,
  ) {
    await this.authorize(databaseId, (req.user as any));
    const qb = this.data.from(table);
    if (whereJson) {
      const where = JSON.parse(whereJson) as Record<string, any>;
      for (const [k, v] of Object.entries(where)) qb.eq(k, v);
    }
    if (orderBy) qb.order(orderBy, (order as 'asc' | 'desc') ?? 'asc');
    if (limit) qb.limit(parseInt(limit, 10));
    if (page) qb.page(parseInt(page, 10));
    const cols = columns?.split(',').map(c => c.trim()).filter(Boolean);
    return this.data.select(databaseId, qb, cols);
  }

  @Post('tables/:table/rows')
  @ApiOperation({ summary: 'Insert a row' })
  async insertRow(
    @Req() req: Request,
    @Param('databaseId') databaseId: string,
    @Param('table') table: string,
    @Body() body: { data: Record<string, any> },
  ) {
    await this.authorize(databaseId, (req.user as any));
    const result = await this.data.insert(databaseId, table, body.data);
    this.cache.invalidate(databaseId, `schema`);
    this.cache.invalidate(databaseId, `columns:public:${table}`);
    return { row: result };
  }

  @Delete('tables/:table/rows')
  @ApiOperation({ summary: 'Delete rows matching WHERE clause' })
  async deleteRows(
    @Req() req: Request,
    @Param('databaseId') databaseId: string,
    @Param('table') table: string,
    @Body() body: { where: Record<string, any> },
  ) {
    await this.authorize(databaseId, (req.user as any));
    const qb = this.data.from(table);
    for (const [k, v] of Object.entries(body.where || {})) qb.eq(k, v);
    const deleted = await this.data.delete(databaseId, qb);
    return { deleted };
  }

  // ── Query API ───────────────────────────────────────────────────────────

  @Post('query')
  @ApiOperation({ summary: 'Execute raw SQL (SafeQueryExecutor blocks dangerous ops)' })
  async query(
    @Req() req: Request,
    @Param('databaseId') databaseId: string,
    @Body() body: { sql: string; params?: any[] },
  ) {
    await this.authorize(databaseId, (req.user as any));
    if (body.params?.length) {
      return this.queries.executeParameterized(databaseId, body.sql, body.params);
    }
    return this.queries.execute(databaseId, body.sql);
  }

  // ── Realtime ────────────────────────────────────────────────────────────

  @Get('realtime')
  @ApiOperation({ summary: 'List tables with active realtime subscriptions' })
  async listReactive(@Req() req: Request, @Param('databaseId') databaseId: string) {
    await this.authorize(databaseId, (req.user as any));
    return this.realtime.listActiveTables(databaseId);
  }

  @Post('tables/:table/realtime/enable')
  @ApiOperation({ summary: 'Enable realtime for a table' })
  async enableRealtime(
    @Req() req: Request,
    @Param('databaseId') databaseId: string,
    @Param('table') table: string,
    @Query('schema') schemaName = 'public',
  ) {
    await this.authorize(databaseId, (req.user as any));
    await this.realtime.subscribeToTable(databaseId, schemaName, table);
    return { realtime: true, table, schema: schemaName };
  }

  @Post('tables/:table/realtime/disable')
  @ApiOperation({ summary: 'Disable realtime for a table' })
  async disableRealtime(
    @Req() req: Request,
    @Param('databaseId') databaseId: string,
    @Param('table') table: string,
    @Query('schema') schemaName = 'public',
  ) {
    await this.authorize(databaseId, (req.user as any));
    await this.realtime.disableTable(databaseId, schemaName, table);
    return { realtime: false, table, schema: schemaName };
  }

  // ── Migrations ──────────────────────────────────────────────────────────

  @Get('migrations')
  @ApiOperation({ summary: 'List applied migrations' })
  async listMigrations(@Req() req: Request, @Param('databaseId') databaseId: string) {
    await this.authorize(databaseId, (req.user as any));
    return this.migrations.list(databaseId);
  }

  @Post('migrations/apply')
  @ApiOperation({ summary: 'Apply a migration (DDL/DML with tracking)' })
  async applyMigration(
    @Req() req: Request,
    @Param('databaseId') databaseId: string,
    @Body() body: { sql: string; name?: string },
  ) {
    await this.authorize(databaseId, (req.user as any));
    return this.migrations.apply(databaseId, {
      sql: body.sql,
      name: body.name,
      appliedBy: (req.user as any),
    });
  }
}
