-- Migration 059: Add photographer_review_url for Photographer Review step
--
-- Allows photographer to upload a link when validating client selection (step 6).
-- Same logic as photographer_selection_url: JSONB array of URLs.
-- Column is added before step_notes_photographer_review (logical order).

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS photographer_review_url JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS photographer_review_uploaded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.collections.photographer_review_url IS 'URL(s) uploaded by photographer during review/validation of client selection (step 6).';
COMMENT ON COLUMN public.collections.photographer_review_uploaded_at IS 'When the last photographer review URL was uploaded.';
