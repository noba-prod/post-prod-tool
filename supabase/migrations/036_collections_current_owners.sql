-- ============================================================================
-- Migration 036: Add collections.current_owners
-- Description:
--   Stores the active owner role(s) for the step currently in progress.
--   Values are collection_member_role[] (noba, client, photographer, agency,
--   photo_lab, retouch_studio, handprint_lab).
-- ============================================================================

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS current_owners public.collection_member_role[] NOT NULL
  DEFAULT ARRAY[]::public.collection_member_role[];

COMMENT ON COLUMN public.collections.current_owners IS
  'Current owner role(s) derived from the active in-progress step in step_statuses.';

-- Best-effort backfill for existing in-progress collections using substatus.
UPDATE public.collections
SET current_owners =
  CASE
    WHEN status <> 'in_progress' THEN ARRAY[]::public.collection_member_role[]
    WHEN substatus = 'shooting' THEN ARRAY['noba'::public.collection_member_role]
    WHEN substatus = 'negatives_drop_off' THEN ARRAY['noba'::public.collection_member_role, 'photo_lab'::public.collection_member_role]
    WHEN substatus = 'low_res_scanning' THEN ARRAY['noba'::public.collection_member_role, 'photo_lab'::public.collection_member_role]
    WHEN substatus = 'photographer_selection' THEN
      CASE
        WHEN photographer_collaborates_with_agency
          THEN ARRAY['noba'::public.collection_member_role, 'photographer'::public.collection_member_role, 'agency'::public.collection_member_role]
        ELSE ARRAY['noba'::public.collection_member_role, 'photographer'::public.collection_member_role]
      END
    WHEN substatus = 'client_selection' THEN ARRAY['noba'::public.collection_member_role, 'client'::public.collection_member_role]
    WHEN substatus = 'photographer_check_client_selection' THEN
      CASE
        WHEN photographer_collaborates_with_agency
          THEN ARRAY['noba'::public.collection_member_role, 'photographer'::public.collection_member_role, 'agency'::public.collection_member_role]
        ELSE ARRAY['noba'::public.collection_member_role, 'photographer'::public.collection_member_role]
      END
    WHEN substatus = 'low_res_to_high_res' THEN
      CASE
        WHEN handprint_different_from_original_lab
          THEN ARRAY['noba'::public.collection_member_role, 'handprint_lab'::public.collection_member_role]
        ELSE ARRAY['noba'::public.collection_member_role, 'photo_lab'::public.collection_member_role]
      END
    WHEN substatus = 'edition_request' THEN
      CASE
        WHEN photographer_collaborates_with_agency
          THEN ARRAY['noba'::public.collection_member_role, 'photographer'::public.collection_member_role, 'agency'::public.collection_member_role]
        ELSE ARRAY['noba'::public.collection_member_role, 'photographer'::public.collection_member_role]
      END
    WHEN substatus = 'final_edits' THEN ARRAY['noba'::public.collection_member_role, 'retouch_studio'::public.collection_member_role]
    WHEN substatus = 'photographer_last_check' THEN
      CASE
        WHEN photographer_collaborates_with_agency
          THEN ARRAY['noba'::public.collection_member_role, 'photographer'::public.collection_member_role, 'agency'::public.collection_member_role]
        ELSE ARRAY['noba'::public.collection_member_role, 'photographer'::public.collection_member_role]
      END
    WHEN substatus = 'client_confirmation' THEN ARRAY['noba'::public.collection_member_role, 'client'::public.collection_member_role]
    ELSE ARRAY[]::public.collection_member_role[]
  END;
