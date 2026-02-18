-- ============================================================================
-- Migration 038: Backfill current_owners (photographer_check, edition_request, photographer_last_check)
-- Description:
--   Updates current_owners for in-progress collections in steps where agency
--   should be included when photographer_collaborates_with_agency:
--   - photographer_check_client_selection
--   - edition_request
--   - photographer_last_check
--   Each: noba + photographer + agency (if collaborates), else noba + photographer.
-- ============================================================================

BEGIN;

UPDATE public.collections
SET current_owners =
  CASE
    WHEN photographer_collaborates_with_agency
      THEN ARRAY['noba'::public.collection_member_role, 'photographer'::public.collection_member_role, 'agency'::public.collection_member_role]
    ELSE ARRAY['noba'::public.collection_member_role, 'photographer'::public.collection_member_role]
  END
WHERE status = 'in_progress'
  AND substatus IN ('photographer_check_client_selection', 'edition_request', 'photographer_last_check')
  AND photographer_collaborates_with_agency;

-- Also fix photographer_check_client_selection and non-agency editions (set noba+photographer only)
UPDATE public.collections
SET current_owners = ARRAY['noba'::public.collection_member_role, 'photographer'::public.collection_member_role]
WHERE status = 'in_progress'
  AND substatus IN ('photographer_check_client_selection', 'edition_request', 'photographer_last_check')
  AND NOT photographer_collaborates_with_agency;

COMMIT;
