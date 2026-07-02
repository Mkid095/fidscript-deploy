import { FidscriptClient } from '../client';

export interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  projectId?: string;
  resourceType?: string;
  resourceId?: string;
  readAt?: string | null;
  dismissedAt?: string | null;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  type: string;
  timestamp: string;
  actorId: string | null;
  actorType: string | null;
  resourceType: string;
  resourceId: string;
  projectId: string | null;
  metadata: Record<string, unknown>;
  summary: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

/**
 * NotificationsModule
 *
 * User-facing notification inbox + domain activity feed.
 * Notifications are per-user (read state tracked independently).
 */
export class NotificationsModule {
  constructor(private client: FidscriptClient) {}

  // ── Notification Inbox ────────────────────────────────────────────────────

  /**
   * List notifications for the current user.
   */
  async list(options?: {
    unreadOnly?: boolean;
    projectId?: string;
    limit?: number;
  }): Promise<{ notifications: UserNotification[] }> {
    const params: Record<string, string | number | boolean> = {};
    if (options?.unreadOnly) params.unreadOnly = 'true';
    if (options?.projectId) params.projectId = options.projectId;
    if (options?.limit) params.limit = options.limit;
    return this.client.get(`/api/v1/notifications`, params);
  }

  /**
   * Get the unread notification count (for the bell badge).
   */
  async getUnreadCount(): Promise<{ count: number }> {
    return this.client.get(`/api/v1/notifications/unread-count`);
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId: string): Promise<{ success: boolean }> {
    return this.client.post(`/api/v1/notifications/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read (optionally filtered by project).
   */
  async markAllAsRead(projectId?: string): Promise<{ success: boolean; updated: number }> {
    return this.client.post(`/api/v1/notifications/mark-all-read`, projectId ? { projectId } : {});
  }

  /**
   * Dismiss a notification (removes from inbox).
   */
  async dismiss(notificationId: string): Promise<{ success: boolean }> {
    return this.client.post(`/api/v1/notifications/${notificationId}/dismiss`);
  }

  // ── Domain Activity Feed ──────────────────────────────────────────────────

  /**
   * Get the activity feed for a specific domain.
   */
  async getDomainActivity(projectId: string, domainId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ entries: ActivityEntry[]; total: number }> {
    const params: Record<string, number> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.offset) params.offset = options.offset;
    return this.client.get(
      `/api/v1/projects/${projectId}/domains/${domainId}/activity`,
      params,
    );
  }

  /**
   * Get the activity feed for all domains in a project.
   */
  async getProjectDomainActivity(projectId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ entries: ActivityEntry[]; total: number }> {
    const params: Record<string, number> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.offset) params.offset = options.offset;
    return this.client.get(
      `/api/v1/projects/${projectId}/domains/activity`,
      params,
    );
  }
}
