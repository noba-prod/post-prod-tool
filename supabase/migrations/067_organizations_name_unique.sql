-- ============================================================================
-- Migration 067: Enforce unique organization names globally
-- Description: organization name is the unique identifier across all types
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS organizations_name_unique_idx
  ON public.organizations (lower(btrim(name)));
