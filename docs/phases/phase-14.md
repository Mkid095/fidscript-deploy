# Phase 14: Queues Platform

**Status:** Planned

**Blocked By:** Phase 13

---

## Objective

Build NATS JetStream-powered queue system.

---

## Deliverables

- [ ] Queue creation
- [ ] Message publishing
- [ ] Message consumption
- [ ] Retry configuration
- [ ] Dead letter queues
- [ ] Dashboard queue screens

---

## Events Produced

- queue.created
- queue.message_published
- queue.message_consumed
- queue.message_failed
- queue.message_retried
- queue.dead_lettered

---

## Success Criteria

- [ ] Queues can be created
- [ ] Messages can be published
- [ ] Messages can be consumed
- [ ] Retries work correctly
- [ ] Dead letter queues function

---

## Dependencies

- Phase 13 (Functions) complete

---

## Testing Requirements

- [ ] Publish/consume tests
- [ ] Retry tests
- [ ] DLQ tests

---

## Next Phase

[Phase 15: Scheduler Platform](./phase-15.md)
