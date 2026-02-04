-- ============================================================================
-- Migration 018: photographer_check_due_date and photographer_check_due_time on collections
-- Description: Hand print flow — photographer validates client selection before LR→HR (collections-logic §10.5b)
-- ============================================================================

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS photographer_check_due_date DATE NULL,
  ADD COLUMN IF NOT EXISTS photographer_check_due_time TEXT NULL;

COMMENT ON COLUMN public.collections.photographer_check_due_date IS 'Due date for photographer to review/validate client selection (Hand print only; before LR to HR conversion).';
COMMENT ON COLUMN public.collections.photographer_check_due_time IS 'Due time for photographer check client selection (e.g. Midday - 12:00pm).';

-- After applying this migration, reload PostgREST schema cache so the API accepts these columns:
-- Run in SQL Editor: NOTIFY pgrst, 'reload schema';
-- Or restart the Supabase project so INSERT/UPDATE with photographer_check_due_* succeed.
