/**
 * LiveQueryController — exposes the Convex/InstantDB-style .watch() to the SDK
 * over Server-Sent Events (SSE).
 *
 * The flow:
 *   1. SDK calls POST /databases/:id/live-query with { table, where?, orderBy?, limit? }
 *   2. Server subscribes to the table realtime + returns an SSE stream
 *   3. Initial result is sent as 'data: {"type":"initial","rows":...}'
 *   4. Subsequent changes stream as 'data: {"type":"patch","op":"INSERT|UPDATE|DELETE","new":...,"old":...}'
 *   5. Client closes the connection → server cleans up the subscription
 */
import { Controller, Post, Body, Param, Sse, MessageEvent, UseGuards, Req, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Observable, Subject, defer, from, merge, of } from 'rxjs';
import { map, takeUntil, catchError } from 'rxjs/operators';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { Request } from 'express';
import { PrismaService } from '@/prisma/prisma.service';
import { LiveQueryManager } from '../services/live-query.manager';
import { DbDataService, QueryBuilder } from '../services/db-data.service';
import { EventService } from '@/modules/events/event.service';
import { DbRealtimeService } from '../services/db-realtime.service';
import type { RealtimeEvent } from '../providers/realtime/realtime-provider.interface';

interface WatchRequest {
  table: string;
  where?: Record<string, any>;
  orderBy?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  page?: number;
}

@ApiTags('databases')
@Controller('databases/:databaseId')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LiveQueryController {
  constructor(
    private prisma: PrismaService,
    private liveQuery: LiveQueryManager,
    private data: DbDataService,
    private eventService: EventService,
    private realtimeService: DbRealtimeService,
  ) {}

  /**
   * SSE endpoint: GET /databases/:id/live-query/:table?where=...&orderBy=...
   * Streams the table + patches as events change.
   */
  @Sse('live-query/:table')
  @ApiOperation({ summary: 'Subscribe to live table updates (Server-Sent Events)' })
  stream(
    @Req() req: Request,
    @Param('databaseId') databaseId: string,
    @Param('table') table: string,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>(subscriber => {
      // Authorize
      const userId = (req.user as any).userId;
      this.authorize(databaseId, userId)
        .then(() => {
          const whereJson = (req.query as any).where;
          const where = whereJson ? JSON.parse(whereJson) : {};
          const qb = this.data.from(table);
          for (const [k, v] of Object.entries(where)) qb.eq(k, v);
          if (req.query.orderBy) qb.order(String(req.query.orderBy), (req.query.order as any) ?? 'asc');
          if (req.query.limit) qb.limit(parseInt(String(req.query.limit), 10));
          if (req.query.page) qb.page(parseInt(String(req.query.page), 10));

          // Subscribe
          let currentRows: any[] = [];
          const unsub = this.liveQuery.watch(databaseId, table, qb, (rows) => {
            currentRows = rows;
            subscriber.next({ data: { type: 'initial', rows } });
          });

          // Stream realtime changes
          const handler = ((e: RealtimeEvent) => {
            if (e.databaseId !== databaseId || e.table !== table) return;
            subscriber.next({ data: { type: 'patch', event: e } });
          }) as any;
          // Capture cleanup function
          const eventUnsub = this.eventService.on('database.row.changed', handler);

          // Cleanup on disconnect
          return () => {
            eventUnsub();
            const u = unsub as unknown as () => void | Promise<void>;
            void u();
          };
        })
        .catch(err => subscriber.error(err));
    });
  }

  /**
   * POST /databases/:id/live-query — initial snapshot (used by watch() if SSE is unavailable).
   * Returns { rows, count } like the standard select endpoint.
   */
  @Post('live-query')
  @ApiOperation({ summary: 'Get a live-query snapshot (initial fetch only)' })
  async snapshot(
    @Req() req: Request,
    @Param('databaseId') databaseId: string,
    @Body() body: WatchRequest,
  ) {
    const userId = (req.user as any).userId;
    await this.authorize(databaseId, userId);
    const qb = this.data.from(body.table);
    if (body.where) for (const [k, v] of Object.entries(body.where)) qb.eq(k, v);
    if (body.orderBy) qb.order(body.orderBy, body.order ?? 'asc');
    if (body.limit) qb.limit(body.limit);
    if (body.page) qb.page(body.page);
    return this.data.select(databaseId, qb);
  }

  private async authorize(databaseId: string, userId: string) {
    const db = await this.prisma.managedDatabase.findUnique({
      where: { id: databaseId },
      include: { project: true },
    });
    if (!db) throw new NotFoundException('Database not found');
    if (db.project.ownerId === userId) return;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: db.projectId, userId } },
    });
    if (!member) throw new ForbiddenException('Access denied');
  }
}
