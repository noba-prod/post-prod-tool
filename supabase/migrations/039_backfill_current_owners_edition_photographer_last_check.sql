-- ============================================================================
-- Migration 039: Backfill current_owners for edition_request + photographer_last_check
-- Description:
--   When photographer_collaborates_with_agency, agency users should be able to
--   take actions in Edition request and Photographer last check. This updates
--   current_owners for in-progress collections in those steps to include agency.
--   (Migration 038 was executed before this logic was added.)
-- ============================================================================

BEGIN;

UPDATE public.collections
SET current_owners = ARRAY['noba'::public.collection_member_role, 'photographer'::public.collection_member_role, 'agency'::public.collection_member_role]
WHERE status = 'in_progress'
  AND substatus IN ('edition_request', 'photographer_last_check')
  AND photographer_collaborates_with_agency = true;

COMMIT;
