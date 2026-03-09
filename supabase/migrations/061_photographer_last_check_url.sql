-- Migration 061: Add photographer_last_check_url for Photographer Last Check step (step 10)
--
-- Allows photographer to add additional links when final edits don't include everything.
-- Same logic as other URL columns: JSONB array of URLs.

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS photographer_last_check_url JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS photographer_last_check_uploaded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.collections.photographer_last_check_url IS 'URL(s) added by photographer during last check (step 10) when finals need additional links.';
COMMENT ON COLUMN public.collections.photographer_last_check_uploaded_at IS 'When the last photographer last check URL was uploaded.';
