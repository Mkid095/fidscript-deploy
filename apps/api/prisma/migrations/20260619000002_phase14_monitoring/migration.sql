-- Phase 14: Monitoring — sustained-condition timing + notification delivery records.

-- Alert: track how long a condition has held (PENDING → FIRING) and when it fired.
ALTER TABLE "monitoring.alerts" ADD COLUMN "first_triggered_at" TIMESTAMPTZ;
ALTER TABLE "monitoring.alerts" ADD COLUMN "fired_at" TIMESTAMPTZ;
ALTER TABLE "monitoring.alerts" ALTER COLUMN "status" SET DEFAULT 'pending';

-- Notification: one row per delivery attempt on a firing alert.
CREATE TABLE "monitoring.notifications" (
    "id" TEXT NOT NULL,
    "alert_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitoring.notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "monitoring.notifications_alert_id_idx" ON "monitoring.notifications"("alert_id");

ALTER TABLE "monitoring.notifications"
    ADD CONSTRAINT "monitoring.notifications_alert_id_fkey"
    FOREIGN KEY ("alert_id") REFERENCES "monitoring.alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
