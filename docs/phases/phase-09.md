# Phase 09: Authentication Platform

**Status:** Planned

**Blocked By:** Phase 08

---

## Objective

Build application-level authentication for projects (separate from platform auth).

---

## Deliverables

- [ ] Email/password auth for apps
- [ ] Magic link authentication
- [ ] Magic code authentication
- [ ] OAuth integration (Google, GitHub)
- [ ] Role and permission management
- [ ] API key management for apps
- [ ] Dashboard auth screens

---

## Database Tables

- projects.app_users
- projects.app_sessions
- projects.app_roles
- projects.app_permissions

---

## Events Produced

- auth.user_created
- auth.user_verified
- auth.login_succeeded
- auth.login_failed
- auth.api_key_created

---

## Success Criteria

- [ ] Apps can have their own users
- [ ] Magic links work
- [ ] OAuth providers connect
- [ ] Roles and permissions work
- [ ] API keys can be created

---

## Dependencies

- Phase 08 (Storage) complete

---

## Testing Requirements

- [ ] Auth flow integration tests
- [ ] OAuth tests (mock)
- [ ] Permission tests

---

## Next Phase

[Phase 10: Email Platform](./phase-10.md)
