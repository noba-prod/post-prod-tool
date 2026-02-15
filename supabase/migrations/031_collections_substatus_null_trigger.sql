-- ============================================================================
-- Migration 031: Ensure substatus is NULL when status != in_progress
-- Description: BEFORE UPDATE trigger so any update path (app or Table Editor / SQL)
--              that sets status to draft/upcoming/completed/canceled also clears
--              substatus, satisfying collections_substatus_when_in_progress_check.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.collections_clear_substatus_when_not_in_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'in_progress' THEN
    NEW.substatus := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS collections_substatus_null_when_not_in_progress ON public.collections;

CREATE TRIGGER collections_substatus_null_when_not_in_progress
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.collections_clear_substatus_when_not_in_progress();

COMMENT ON FUNCTION public.collections_clear_substatus_when_not_in_progress() IS
  'Ensures substatus is NULL whenever status is not in_progress (for check constraint).';
