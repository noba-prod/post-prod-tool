-- ============================================================================
-- Migration 007: Add phone prefix columns
-- Description: Adds prefix columns to organizations and profiles
-- ============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS prefix TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS prefix TEXT;

COMMENT ON COLUMN public.organizations.prefix IS 'Phone country prefix (e.g., +34)';
COMMENT ON COLUMN public.profiles.prefix IS 'Phone country prefix (e.g., +34)';
