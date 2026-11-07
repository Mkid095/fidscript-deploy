/**
 * Auth organizations — CRUD orgs, list roles, members, invitations.
 * Split out of auth.ts for ANPAS 150-line limit.
 */

import type { AuthOrgsHost } from './auth-host';
import type { Organization, OrgRole, OrgMember, Invitation } from './auth-types';

export function applyAuthOrgsMethods(host: AuthOrgsHost): void {
  const client = host.client;

  host.organizations = () =>
    client.get<Organization[]>('/api/v1/organizations');

  host.getOrganization = (orgId) =>
    client.get(`/api/v1/organizations/${orgId}`);

  host.createOrganization = (name, slug) =>
    client.post<Organization>('/api/v1/organizations', { name, slug });

  host.updateOrganization = (orgId, data) =>
    client.patch(`/api/v1/organizations/${orgId}`, data);

  host.deleteOrganization = (orgId) =>
    client.delete<{ deleted: boolean }>(`/api/v1/organizations/${orgId}`);

  host.orgRoles = (orgId) =>
    client.get<OrgRole[]>(`/api/v1/organizations/${orgId}/roles`);

  host.orgMembers = (orgId) =>
    client.get<OrgMember[]>(`/api/v1/organizations/${orgId}/members`);

  host.inviteOrgMember = (orgId, email, roleName) =>
    client.post(`/api/v1/organizations/${orgId}/invitations`, { email, roleName });

  host.listOrgInvitations = (orgId) =>
    client.get<Invitation[]>(`/api/v1/organizations/${orgId}/invitations`);

  host.revokeOrgInvitation = (orgId, invitationId) =>
    client.delete(`/api/v1/organizations/${orgId}/invitations/${invitationId}`);

  host.acceptInvitation = (token) =>
    client.post<{ success: boolean; organizationId: string }>('/api/v1/invitations/accept', { token });
}
