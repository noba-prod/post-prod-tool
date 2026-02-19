-- ============================================================================
-- Migration 047: Ensure noba participant columns exist on collections
-- Description: Some environments missed migration 011, causing notification
--              recipient resolution to fail when selecting noba_user_ids.
-- ============================================================================

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS noba_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS noba_edit_permission_by_user_id JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.collections.noba_user_ids IS 'Array of user UUIDs: noba* internal users (owner + members added via New member).';
COMMENT ON COLUMN public.collections.noba_edit_permission_by_user_id IS 'Edit permission by user id for noba* members (milestone edit power once published).';
