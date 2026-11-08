-- Releasing a domain puts the customer's zone back the way it was.
--
-- Before the platform overwrites a record (the apex A/CNAME, the MX/SPF/
-- DKIM/DMARC set), it remembers what was there. `original_*` is NULL when
-- there was nothing before — so "restore" means "delete our record" — and
-- holds the customer's value when there was, so "restore" puts it back.
--
-- A domain delete is then: write the originals back (or delete where there
-- was none), and the name is fully released.
ALTER TABLE "projects"."managed_dns_records"
  ADD COLUMN IF NOT EXISTS "original_value"    TEXT,
  ADD COLUMN IF NOT EXISTS "original_ttl"      INTEGER,
  ADD COLUMN IF NOT EXISTS "original_priority" INTEGER,
  ADD COLUMN IF NOT EXISTS "original_proxied"  BOOLEAN;
