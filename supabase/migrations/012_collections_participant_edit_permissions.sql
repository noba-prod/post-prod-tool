-- ============================================================================
-- Migration 012: participant_edit_permissions on collections
-- Description: Store edit permission by user id per participant role so the
-- Edit permission switch in the Participants step persists and viewers are
-- correctly resolved in view mode (collections-logic §8).
-- ============================================================================

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS participant_edit_permissions JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.collections.participant_edit_permissions IS 'Edit permission by user id per role: { "client": { "userId": true }, "producer": { ... }, ... }. Used for Edit permission switch and viewer vs owner in view mode.';
