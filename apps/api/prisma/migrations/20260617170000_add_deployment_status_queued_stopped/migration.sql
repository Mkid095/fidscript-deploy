-- Migration: 20260617170000_add_deployment_status_queued_stopped
-- Phase 06: Deployment Engine — status state machine + STOPPED state
-- Applied: 2026-06-17

-- Add STOPPED and QUEUED to DeploymentStatus enum
ALTER TYPE "DeploymentStatus" ADD VALUE IF NOT EXISTS 'QUEUED';
ALTER TYPE "DeploymentStatus" ADD VALUE IF NOT EXISTS 'STOPPED';

-- Index projectId on deployments for faster lookups
CREATE INDEX IF NOT EXISTS "projects.deployments_projectId_idx"
  ON "projects.deployments" ("project_id");