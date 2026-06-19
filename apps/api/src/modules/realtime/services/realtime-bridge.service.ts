import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RealtimeGateway } from '../gateways/realtime.gateway';

/**
 * Phase 13 — the missing half of realtime: a bridge from the platform event bus
 * (Phase 02) to connected socket clients.
 *
 * Before this, the gateway only *emitted* realtime lifecycle events OUT
 * (client_joined / message_sent / …). Nothing fanned platform events
 * (deployment / function / queue / email / cron / domain) IN to clients, so a
 * deployment going LIVE never reached the dashboard. See AUDIT.md §C (Realtime)
 * and docs/phases/phase-13.md.
 *
 * Design:
 *  - Subscribes to every platform event via @OnEvent('**'). EventService wraps
 *    the caller's payload as PlatformEvent { type, timestamp, metadata: payload },
 *    so the original payload lives at `event.metadata`.
 *  - Extracts the owning project. Two payload conventions coexist in the
 *    codebase, both handled:
 *      flat : { ..., projectId }                          (queues/functions/cron/realtime)
 *      audit: { resourceType:'project', resourceId }      (projects.project.* / projects.env_var.*)
 *             { metadata: { projectId } }                 (deployments.deployment.*)
 *  - Broadcasts to `project:<id>` — but only authorized clients are in that
 *    room (membership is granted by RealtimeSubscriptionService at join time),
 *    so authorization is enforced structurally, not re-checked here.
 */
@Injectable()
export class RealtimeBridgeService {
  private readonly logger = new Logger(RealtimeBridgeService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  @OnEvent('**')
  handlePlatformEvent(event: {
    type: string;
    timestamp?: Date | string;
    metadata?: Record<string, unknown>;
  }): void {
    if (!event?.type) return;
    // Realtime's own lifecycle events are already pushed on the channel socket;
    // skip to avoid double delivery + feedback echo.
    if (event.type.startsWith('realtime.')) return;

    const projectId = this.projectIdOf(event.metadata);
    if (!projectId) return; // not project-scoped (e.g. identity.session.*) — no room to route to

    this.gateway.broadcastToProject(projectId, event.type, {
      type: event.type,
      timestamp: event.timestamp ?? new Date().toISOString(),
      data: event.metadata,
    });
    this.logger.debug(`fanned out "${event.type}" → project:${projectId}`);
  }

  /** Resolve the owning project from either payload convention (or null). */
  private projectIdOf(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null;
    const m = payload as Record<string, unknown>;
    const direct = (m.projectId as string | undefined) ?? (m.project_id as string | undefined);
    if (direct) return direct;
    if (m.resourceType === 'project' && typeof m.resourceId === 'string') {
      return m.resourceId;
    }
    const nested = (m.metadata as Record<string, unknown> | undefined)?.projectId;
    return typeof nested === 'string' ? nested : null;
  }
}
