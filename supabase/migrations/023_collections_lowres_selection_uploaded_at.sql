-- ============================================================================
-- Migration 023: Add lowres_selection_uploaded_at to collections
-- Description: When the low-res URL was last set (for "X minutes ago" display).
-- ============================================================================

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS lowres_selection_uploaded_at TIMESTAMPTZ;
