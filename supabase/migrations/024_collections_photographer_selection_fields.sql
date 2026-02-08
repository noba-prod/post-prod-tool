-- ============================================================================
-- Migration 024: Add photographer selection fields to collections
-- Description: URL, notes, uploaded_at for step 4; photographer request notes for missing photos.
-- ============================================================================

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS photographer_selection_url TEXT,
  ADD COLUMN IF NOT EXISTS photographer_notes01 TEXT,
  ADD COLUMN IF NOT EXISTS photographer_selection_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS photographer_request_additional_notes TEXT;
