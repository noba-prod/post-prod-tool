-- ============================================================================
-- Migration 026: photographer_missingphotos, lowres re-upload (02), event type
-- ============================================================================

-- New column: photographer comments when requesting missing photos (step 4)
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS photographer_missingphotos TEXT;

-- Re-upload after missing photos request (step 3)
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS lowres_selection_url02 TEXT,
  ADD COLUMN IF NOT EXISTS lowres_lab_notes02 TEXT,
  ADD COLUMN IF NOT EXISTS lowres_selection_uploaded_at02 TIMESTAMPTZ;

-- Event type: photographer requested additional photos (reverts step 4 to locked, step 3 to active)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'collection_event_type' AND e.enumlabel = 'photographer_requested_additional_photos'
  ) THEN
    ALTER TYPE public.collection_event_type ADD VALUE 'photographer_requested_additional_photos';
  END IF;
END
$$;
