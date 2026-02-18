-- ============================================================================
-- Migration 037: Remove duplicate photographer rows for agency users
-- Description:
--   When photographer_collaborates_with_agency = true, agency users must only
--   have role='agency', never role='photographer'. Delete any photographer rows
--   for users who also have an agency row in the same collection.
--   Photographer and agency are separate; agency users should never get
--   photographer role.
-- ============================================================================

BEGIN;

DELETE FROM public.collection_members cm
USING public.collections c
WHERE cm.collection_id = c.id
  AND c.photographer_collaborates_with_agency = true
  AND cm.role = 'photographer'
  AND EXISTS (
    SELECT 1
    FROM public.collection_members cm2
    WHERE cm2.collection_id = cm.collection_id
      AND cm2.user_id = cm.user_id
      AND cm2.role = 'agency'
  );

COMMIT;
