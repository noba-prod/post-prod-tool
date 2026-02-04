-- ============================================================================
-- Migration 019: publishing_date and publishing_time on collections
-- Description: Optional publishing date/time from New Collection modal (replaces deadline in modal; deadline stays in Check Finals step).
-- ============================================================================

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS publishing_date DATE NULL,
  ADD COLUMN IF NOT EXISTS publishing_time TEXT NULL;

COMMENT ON COLUMN public.collections.publishing_date IS 'Optional publishing date from New Collection modal.';
COMMENT ON COLUMN public.collections.publishing_time IS 'Optional publishing time from New Collection modal (e.g. End of day - 05:00pm).';

-- After applying this migration, reload PostgREST schema cache so the API accepts these columns:
-- Run in SQL Editor: NOTIFY pgrst, 'reload schema';
