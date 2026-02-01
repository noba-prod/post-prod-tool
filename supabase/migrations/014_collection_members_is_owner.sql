-- ============================================================================
-- Migration 014: is_owner on collection_members
-- Description: Mark the collection creator (producer/manager) for the noba* section.
-- ============================================================================

ALTER TABLE public.collection_members
  ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.collection_members.is_owner IS 'True for the user who created the collection (producer/manager role). Used to always show the owner in the noba* section.';
