-- ============================================================================
-- Migration 087: Align handprint_lab_id when photo lab owns high-res
-- Description:
--   Migration 065 only backfilled rows where handprint_lab_id IS NULL.
--   Collections can still have handprint_different_from_original_lab = false
--   while handprint_lab_id points at a stale/different org, which breaks
--   handprint_lab notification resolution (photo_lab members never matched).
--
--   1) Backfill mismatched rows (broader than 065).
--   2) CHECK constraint so new writes cannot diverge again.
-- ============================================================================

UPDATE public.collections
SET handprint_lab_id = photo_lab_id,
    updated_at = now()
WHERE handprint_different_from_original_lab = false
  AND low_res_to_high_res_hand_print = true
  AND photo_lab_id IS NOT NULL
  AND handprint_lab_id IS DISTINCT FROM photo_lab_id;

ALTER TABLE public.collections
  DROP CONSTRAINT IF EXISTS collections_handprint_lab_matches_photo_when_shared;

ALTER TABLE public.collections
  ADD CONSTRAINT collections_handprint_lab_matches_photo_when_shared
  CHECK (
    handprint_different_from_original_lab = true
    OR low_res_to_high_res_hand_print IS NOT TRUE
    OR photo_lab_id IS NULL
    OR handprint_lab_id IS NULL
    OR handprint_lab_id = photo_lab_id
  );
