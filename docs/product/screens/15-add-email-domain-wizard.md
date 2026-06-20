# Screen Spec — `AddEmailDomainWizard`

> Multi-step wizard at `/dashboard/projects/:id/email/domains/new` (F11). The operator's
> flow for setting up an email domain: ownership TXT → DKIM/SPF/DMARC/MX → ACTIVE.

## 1. Purpose
The user adds an email domain and follows the platform's verification steps. The principle:
**email setup is multi-step; the wizard holds the user's hand through every record.**

## 2. Route + access
- **Route:** `/dashboard/projects/:id/email/domains/new`.
- **Permission:** any member (`O/A/D/V`); viewer greys the Next button.
- **Project scope:** creates an `EmailDomain` row in the current project.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ Add email domain                                                [X] │
├──────────────────────────────────────────────────────────────────────┤
│ ●────●────○────○  1.Domain  2.Ownership  3.Records  4.Done         │
├──────────────────────────────────────────────────────────────────────┤
│ Domain *                                                             │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ mail.acme.com                                                    ││
│ └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│ → This will create an email domain that can send and receive mail.  │
│                                                                      │
│                                       [Cancel]  [ Next ]             │
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Stepper** (top): 4 steps — Domain → Ownership → Records → Done.
- **Step 1: Domain**:
  - Domain input (valid hostname).
  - Async check (the domain is not already in the platform).
  - "Next" → POST MAIL-01; the response includes `ownershipToken`.
- **Step 2: Ownership TXT**:
  - Instructions: "Add this TXT record to your DNS:" + the `ownershipToken`.
  - Copy button per record.
  - "I've added the TXT" → POST MAIL-05 → status transitions.
  - On VERIFIED → auto-advance to step 3.
- **Step 3: DKIM/SPF/DMARC/MX**:
  - Per-record instructions (auto-generated from the platform's DNS).
  - "Verify all" → POST MAIL-05 → status transitions.
  - On ACTIVE → auto-advance to step 4.
- **Step 4: Done**:
  - Summary card: domain, status (ACTIVE), next steps ("Add a mailbox").
  - "Add a mailbox" CTA (opens the create-mailbox modal pre-filtered to this domain).
  - "Done" closes the wizard.
- **Error states**:
  - Invalid hostname → inline error on step 1.
  - TXT not found → "We didn't see the TXT record yet. DNS can take up to 24h to
    propagate; click Re-check."
  - DKIM/SPF/DMARC/MX partial → "X of 4 records verified. Add the rest to continue."

## 5. Primary + secondary actions
- **Primary (per step)**: "Next" / "Verify" / "Done" / "Add a mailbox".
- **Secondary**: "Cancel" / `[X]`. "Back" on steps 2/3/4.

## 6. API mapping
- **Create domain** — `POST /api/v1/projects/:id/email/domains` (`MAIL-01`) with
  `{domain}`. Returns `{id, domain, status: 'PENDING', ownershipToken}`.
- **Verify** — `POST /api/v1/email/domains/:domainId/verify` (`MAIL-05`).
- **Realtime** — `email.domain_added`, `email.domain_verified`.

## 7. Forms + validation
- **Domain**: required, valid hostname format.
- **Ownership token**: server-generated; the UI just copies it.
- **Records**: server-generated; the UI just copies them.

## 8. Accessibility
- **Focus order**: domain → Next (step 1); records → Verify (step 2/3); summary → Done
  (step 4).
- **Stepper**: `role="navigation"` with `aria-current="step"` on the active step.
- **Live region**: `aria-live="polite"` on the verification status; "Domain verified"
  is announced.
- **Copy buttons**: `aria-label="Copy <record type>"` (e.g. "Copy TXT record").

## 9. Cross-references
- **Phase**: F11 Email UI §6.
- **Service spec**: `docs/product/services/email.md`.
- **Journey**: backend dev's first email domain.
- **Navigation**: Email → Domains → "Add domain" CTA.
- **Related screens**: Email → Domains (parent), Mailboxes (sibling).

## 10. Acceptance criteria
1. The wizard opens at `/dashboard/projects/:id/email/domains/new`; the stepper shows
   4 steps; Step 1 (Domain) is preselected.
2. Domain input validates hostnames; submitting POSTs `MAIL-01`; auto-advances to Step 2.
3. Step 2 shows the ownership TXT record with a Copy button; "Verify" POSTs `MAIL-05`;
   on VERIFIED auto-advances to Step 3.
4. Step 3 shows the DKIM/SPF/DMARC/MX records with Copy buttons; "Verify all" POSTs
   `MAIL-05`; on ACTIVE auto-advances to Step 4.
5. Step 4 shows a summary card; "Add a mailbox" opens the create-mailbox modal.
6. "Back" navigates to the previous step (preserving form state).
7. The wizard surfaces DNS propagation delays ("DNS can take up to 24h to propagate").
8. Realtime events update the status as MAIL-05 responds.
9. Live region announces verification status.
10. Esc / Cancel / [X] close the wizard (confirm if step 2+ and dirty).