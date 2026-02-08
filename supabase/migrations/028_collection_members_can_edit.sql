-- ============================================================================
-- Migration 028: Add can_edit column to collection_members
-- Description: Stores edit permission per member directly on the junction row.
--              When can_edit = true the user can interact with milestone actions
--              (upload links, add comments, trigger missing-photos, etc.)
--              Defaults to true so existing members keep their current behaviour.
-- ============================================================================

ALTER TABLE public.collection_members
  ADD COLUMN IF NOT EXISTS can_edit BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.collection_members.can_edit
  IS 'Whether this member has edit permission for milestone actions in the collection';
