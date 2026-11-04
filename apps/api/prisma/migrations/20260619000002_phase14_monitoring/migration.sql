-- Phase 14: Monitoring — sustained-condition timing + notification delivery records.

-- Alert: track how long a condition has held (PENDING → FIRING) and when it fired.
ALTER TABLE "monitoring"."alerts" ADD COLUMN IF NOT EXISTS "first_triggered_at" TIMESTAMPTZ;
ALTER TABLE "monitoring"."alerts" ADD COLUMN IF NOT EXISTS "fired_at" TIMESTAMPTZ;
ALTER TABLE "monitoring"."alerts" ALTER COLUMN "status" SET DEFAULT 'pending';

-- Notification: one row per delivery attempt on a firing alert.
CREATE TABLE IF NOT EXISTS "monitoring"."notifications" (
    "id" TEXT NOT NULL,
    "alert_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_alert_id_idx" ON "monitoring"."notifications"("alert_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE c.conname = 'notifications_alert_id_fkey'
          AND n.nspname = 'monitoring'
          AND t.relname = 'notifications'
    ) THEN
        ALTER TABLE "monitoring"."notifications" ADD CONSTRAINT "notifications_alert_id_fkey"
    FOREIGN KEY ("alert_id") REFERENCES "monitoring"."alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
