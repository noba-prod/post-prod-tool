-- ============================================================================
-- Migration 022: Add lowres_lab_notes to collections
-- Description: Optional notes from upload low-res step (step 3).
-- ============================================================================

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS lowres_lab_notes TEXT;
