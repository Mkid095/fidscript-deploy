/**
 * Phase 13 — canonical Socket.IO room names.
 *
 * A project room `project:<projectId>` is the authorization boundary for
 * platform-event fan-out: the bridge broadcasts every project-scoped platform
 * event to `project:<id>`, and a client may only join that room after the
 * subscription service verifies ProjectMember membership (Phase 04 RBAC).
 * Centralizing the name here keeps the emitter (bridge) and the gatekeeper
 * (subscription service) from drifting apart.
 */
export const projectRoom = (projectId: string): string => `project:${projectId}`;
