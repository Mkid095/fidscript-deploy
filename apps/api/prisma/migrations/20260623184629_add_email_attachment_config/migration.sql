-- AddEmailAttachmentConfig
CREATE TABLE IF NOT EXISTS "email"."attachment_config" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT 'singleton',
    "provider" VARCHAR(20) NOT NULL DEFAULT 'internal',
    "credentials" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AddEmailAttachment
CREATE TABLE IF NOT EXISTS "email"."email_attachments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "message_id" VARCHAR(255) NOT NULL,
    "mailbox_local" VARCHAR(255) NOT NULL,
    "filename" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(255) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "storage_key" VARCHAR(1000) NOT NULL,
    "storage_provider" VARCHAR(20) NOT NULL,
    "direction" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "email_attachments_message_id_idx" ON "email"."email_attachments" ("message_id");