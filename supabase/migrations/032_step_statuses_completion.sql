-- ============================================================================
-- Migration 032: Per-step status tracking and completion percentage
-- Description: Adds step_statuses JSONB column to persist per-step stage/health
--              labels, and completion_percentage INTEGER for progress display.
-- ============================================================================

-- step_statuses: JSONB map of ViewStepId → { stage, health }
-- Example: { "shooting": { "stage": "done", "health": "on-time" }, "negatives_dropoff": { "stage": "in-progress", "health": "on-track" } }
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS step_statuses JSONB NOT NULL DEFAULT '{}';

-- completion_percentage: 0–100, updated on each step completion
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS completion_percentage INTEGER NOT NULL DEFAULT 0;

-- Constraint: completion_percentage between 0 and 100
ALTER TABLE public.collections
  ADD CONSTRAINT collections_completion_percentage_range
  CHECK (completion_percentage >= 0 AND completion_percentage <= 100);

COMMENT ON COLUMN public.collections.step_statuses IS
  'Per-step status map: { stepId: { stage: "upcoming"|"in-progress"|"done", health: "on-track"|"on-time"|"delayed"|"at-risk"|null } }';

COMMENT ON COLUMN public.collections.completion_percentage IS
  'Percentage of visible steps completed (0-100), updated on each step event';
