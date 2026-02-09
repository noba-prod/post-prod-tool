-- ============================================================================
-- Migration 029: Add client selection fields to collections
-- Description: URL, notes, uploaded_at for step 5 (Client selection).
-- ============================================================================

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS client_selection_url TEXT,
  ADD COLUMN IF NOT EXISTS client_notes01 TEXT,
  ADD COLUMN IF NOT EXISTS client_selection_uploaded_at TIMESTAMPTZ;
