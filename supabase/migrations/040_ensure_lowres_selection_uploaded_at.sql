-- ============================================================================
-- Migration 040: Ensure all *_uploaded_at columns exist
-- Description: Fix "Could not find the 'lowres_selection_uploaded_at' column"
--              (and similar) when schema cache is out of sync or earlier
--              migrations were skipped. These columns store "when the last link
--              was uploaded" per step; step_notes store comment timestamps only.
-- ============================================================================

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS lowres_selection_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS photographer_selection_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_selection_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS highres_selection_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edition_instructions_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finals_selection_uploaded_at TIMESTAMPTZ;
