# Phase 12: Database Platform

**Status:** Planned

**Blocked By:** Phase 11

---

## Objective

Build managed PostgreSQL database service for projects.

---

## Deliverables

- [ ] Database provisioning per project
- [ ] Connection string management
- [ ] Automated backups
- [ ] Backup restoration
- [ ] Connection pooling (PgBouncer)
- [ ] Dashboard database screens

---

## Events Produced

- database.provisioned
- database.updated
- database.backup_started
- database.backup_completed
- database.restored
- database.deleted

---

## Success Criteria

- [ ] Databases can be provisioned
- [ ] Connection strings are accessible
- [ ] Backups are created automatically
- [ ] Restoration works
- [ ] PgBouncer handles connections

---

## Dependencies

- Phase 11 (Realtime) complete

---

## Testing Requirements

- [ ] Provision tests
- [ ] Backup/restore tests
- [ ] Connection pooling tests

---

## Next Phase

[Phase 13: Functions Platform](./phase-13.md)
