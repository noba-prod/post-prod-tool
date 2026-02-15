-- ============================================================================
-- Migration 030: Collection substatus for status = in_progress
-- Description: Adds substatus column to track workflow stages when collection
--              is in_progress. Substatus is NULL when status != in_progress.
-- ============================================================================

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS substatus TEXT NULL;

-- Backfill: existing in_progress collections get initial substatus
UPDATE public.collections
  SET substatus = 'shooting'
  WHERE status = 'in_progress' AND substatus IS NULL;

-- Valid substatus values (only when status = 'in_progress')
ALTER TABLE public.collections
  ADD CONSTRAINT collections_substatus_values_check
  CHECK (
    substatus IS NULL
    OR substatus IN (
      'shooting',
      'negatives_drop_off',
      'low_res_scanning',
      'photographer_selection',
      'client_selection',
      'low_res_to_high_res',
      'edition_request',
      'final_edits',
      'photographer_last_check',
      'client_confirmation'
    )
  );

-- Substatus only set when status = in_progress; must be NULL otherwise
ALTER TABLE public.collections
  ADD CONSTRAINT collections_substatus_when_in_progress_check
  CHECK (
    (status = 'in_progress' AND substatus IS NOT NULL)
    OR (status != 'in_progress' AND substatus IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_collections_substatus
  ON public.collections (status, substatus);

COMMENT ON COLUMN public.collections.substatus IS
  'Workflow stage when status=in_progress: shooting → negatives_drop_off → low_res_scanning → photographer_selection → client_selection → low_res_to_high_res → edition_request → final_edits → photographer_last_check → client_confirmation (then status→completed)';
