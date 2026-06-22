-- Add preferred_auth_method to identity.users
ALTER TABLE "identity.users" ADD COLUMN "preferred_auth_method" VARCHAR(20) NOT NULL DEFAULT 'PASSWORD';
