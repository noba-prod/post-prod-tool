-- ============================================================================
-- Migration 021: Add lowres_selection_url to collections
-- Description: URL where low-res scans/photos are shared (step 3 upload).
-- ============================================================================

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS lowres_selection_url TEXT;
