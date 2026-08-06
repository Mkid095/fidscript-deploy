/**
 * Auth teams — CRUD teams within an organization, add/remove members.
 * Split out of auth.ts for ANPAS 150-line limit.
 */

import type { AuthTeamsHost } from './auth-host';
import type { Team } from './auth-types';

export function applyAuthTeamsMethods(host: AuthTeamsHost): void {
  const client = host.client;

  host.teams = (orgId) =>
    client.get<Team[]>(`/api/v1/organizations/${orgId}/teams`);

  host.getTeam = (orgId, teamId) =>
    client.get<Team>(`/api/v1/organizations/${orgId}/teams/${teamId}`);

  host.createTeam = (orgId, name, description) =>
    client.post<Team>(`/api/v1/organizations/${orgId}/teams`, { name, description });

  host.updateTeam = (orgId, teamId, data) =>
    client.patch(`/api/v1/organizations/${orgId}/teams/${teamId}`, data);

  host.deleteTeam = (orgId, teamId) =>
    client.delete<{ deleted: boolean }>(`/api/v1/organizations/${orgId}/teams/${teamId}`);

  host.addTeamMember = (orgId, teamId, userId, role) =>
    client.post(`/api/v1/organizations/${orgId}/teams/${teamId}/members`, { userId, role });

  host.removeTeamMember = (orgId, teamId, userId) =>
    client.delete(`/api/v1/organizations/${orgId}/teams/${teamId}/members/${userId}`);
}
