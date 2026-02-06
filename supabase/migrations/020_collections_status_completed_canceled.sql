-- ============================================================================
-- Migration 020: Allow status 'completed' and 'canceled' in collections
-- Description: Status is now derived from dates; completed when project_deadline passed.
-- ============================================================================

-- Drop existing CHECK on status (name may vary: collections_status_check or auto-generated)
DO $$
DECLARE
  conname text;
BEGIN
  FOR conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.conrelid = 'public.collections'::regclass
      AND c.contype = 'c'
      AND a.attname = 'status'
  LOOP
    EXECUTE format('ALTER TABLE public.collections DROP CONSTRAINT %I', conname);
  END LOOP;
END $$;

ALTER TABLE public.collections
  ADD CONSTRAINT collections_status_check
  CHECK (status IN ('draft', 'upcoming', 'in_progress', 'completed', 'canceled'));

COMMENT ON COLUMN public.collections.status IS 'draft | upcoming | in_progress | completed | canceled; draft=unpublished, upcoming/in_progress/completed derived from shooting/project dates';
