-- ============================================================================
-- Migration 083: collections.workflow_revision counter
-- Description: Internal counter incremented every time a structural workflow
--              reconfiguration is applied (see plan §3, §12).
--              Used as a dedupe-key factor for the
--              `workflow_reconfiguration_announcement` in-app notification
--              and surfaced in `collection_events.metadata` for diagnostics.
-- ============================================================================

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS workflow_revision INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.collections.workflow_revision IS
  'Increments on every applyStructuralWorkflowChange() (plan §3/§12). 0 = never reconfigured.';
