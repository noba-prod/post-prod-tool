-- ============================================================================
-- Migration 011: noba_user_ids on collections
-- Description: Store noba* internal user ids (owner + additional members) for the Participants block.
-- ============================================================================

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS noba_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS noba_edit_permission_by_user_id JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.collections.noba_user_ids IS 'Array of user UUIDs: noba* internal users (owner + members added via New member).';
COMMENT ON COLUMN public.collections.noba_edit_permission_by_user_id IS 'Edit permission by user id for noba* members (milestone edit power once published).';
