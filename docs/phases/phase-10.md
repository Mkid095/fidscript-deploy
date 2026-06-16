# Phase 10: Email Platform

**Status:** Planned

**Blocked By:** Phase 09

---

## Objective

Build the email infrastructure with Stalwart mail server and provider abstraction.

---

## Deliverables

- [ ] Stalwart mail server integration
- [ ] Domain verification (DKIM, SPF, DMARC)
- [ ] Mailbox management
- [ ] Alias handling
- [ ] SMTP sending
- [ ] Email templates
- [ ] Delivery tracking
- [ ] Resend adapter
- [ ] SMTP adapter
- [ ] Dashboard email screens

---

## Events Produced

- email.sent
- email.delivered
- email.bounced
- email.domain_added
- email.mailbox_created

---

## Success Criteria

- [ ] Emails can be sent
- [ ] DKIM/SPF/DMARC verification works
- [ ] Mailboxes can be created
- [ ] Email logs are tracked
- [ ] Resend adapter works
- [ ] SMTP adapter works

---

## Dependencies

- Phase 09 (Auth Platform) complete

---

## Testing Requirements

- [ ] Email sending tests
- [ ] DKIM/SPF verification tests

---

## Next Phase

[Phase 11: Realtime Platform](./phase-11.md)
