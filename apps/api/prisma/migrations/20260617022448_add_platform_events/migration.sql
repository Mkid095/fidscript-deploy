-- CreateTable
CREATE TABLE "platform.events" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" VARCHAR(255),
    "actor_type" VARCHAR(50),
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" VARCHAR(255) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,

    CONSTRAINT "platform.events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform.events_type_timestamp_idx" ON "platform.events"("type", "timestamp");

-- CreateIndex
CREATE INDEX "platform.events_resource_type_resource_id_idx" ON "platform.events"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "platform.events_actor_id_idx" ON "platform.events"("actor_id");
