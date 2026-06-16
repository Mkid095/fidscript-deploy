# Phase 04: Projects Engine

**Status:** Planned

**Blocked By:** Phase 03

---

## Objective

Build the projects service for project lifecycle management and resource isolation.

---

## Deliverables

- [ ] Project CRUD operations
- [ ] Project types (frontend, backend, worker, cron, docker, static)
- [ ] Project suspension and archival
- [ ] Project cloning
- [ ] Project members and roles
- [ ] Environment variables management
- [ ] Dashboard project screens

---

## Database Tables

- projects.projects
- projects.project_members
- projects.project_settings

---

## Events Produced

- project.created
- project.updated
- project.deleted
- project.suspended
- project.archived
- project.cloned
- project.restored

---

## Success Criteria

- [ ] Projects can be created, listed, updated, deleted
- [ ] All project types supported
- [ ] Projects can be suspended and restored
- [ ] Project cloning works
- [ ] Team members can be added/removed
- [ ] Environment variables work
- [ ] Dashboard shows project list and detail

---

## Dependencies

- Phase 03 (Auth) complete

---

## Testing Requirements

- [ ] Unit tests for project service
- [ ] Integration tests for CRUD
- [ ] Isolation tests (project A cannot access project B)

---

## Next Phase

[Phase 05: Infrastructure Foundation](./phase-05.md)
