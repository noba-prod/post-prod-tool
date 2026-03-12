-- Migration 068: Add photographer_approved_material_urls for step 10 (Photographer Last Check)
--
-- When photographer approves material (finals or high-res) to share with client,
-- stores which URLs they selected. Used in client_confirmation step to show only approved links.

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS photographer_approved_material_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.collections.photographer_approved_material_urls IS 'URLs from material (finals/high-res) that photographer selected to share with client in step 10.';
