-- ============================================================================
-- Migration 089: Remove participant FKs and members for roles no longer required
-- Description:
--   When structural config flags change (edition off, digital-only, etc.),
--   legacy photo_lab / handprint_lab / retouch_studio rows could remain in
--   collections and collection_members. This one-time cleanup aligns DB state
--   with photographer_request_edition, low_res_to_high_res_hand_print, etc.
-- ============================================================================

UPDATE public.collections
SET retouch_studio_id = NULL,
    updated_at = now()
WHERE photographer_request_edition = false
  AND retouch_studio_id IS NOT NULL;

UPDATE public.collections
SET photo_lab_id = NULL,
    handprint_lab_id = NULL,
    updated_at = now()
WHERE low_res_to_high_res_hand_print = false
  AND (photo_lab_id IS NOT NULL OR handprint_lab_id IS NOT NULL);

UPDATE public.collections
SET handprint_lab_id = NULL,
    updated_at = now()
WHERE low_res_to_high_res_hand_print = true
  AND handprint_different_from_original_lab = false
  AND handprint_lab_id IS NOT NULL
  AND handprint_lab_id IS DISTINCT FROM photo_lab_id;

DELETE FROM public.collection_members cm
USING public.collections c
WHERE cm.collection_id = c.id
  AND (
    (cm.role = 'retouch_studio' AND c.photographer_request_edition = false)
    OR (
      cm.role IN ('photo_lab', 'handprint_lab')
      AND c.low_res_to_high_res_hand_print = false
    )
    OR (
      cm.role = 'handprint_lab'
      AND c.low_res_to_high_res_hand_print = true
      AND c.handprint_different_from_original_lab = false
    )
    OR (
      cm.role = 'agency'
      AND c.photographer_collaborates_with_agency = false
    )
  );
