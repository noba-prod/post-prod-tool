-- ============================================================================
-- Migration 065: Backfill handprint_lab_id when handprint = photo lab
-- Description: When handprint_different_from_original_lab is false, the Photo Lab
--   is the owner of step 7 (Handprint to high-res). Set handprint_lab_id = photo_lab_id
--   so notifications (e.g. photographer_check_ready_for_hr) resolve to the correct users.
-- ============================================================================

UPDATE public.collections
SET handprint_lab_id = photo_lab_id
WHERE handprint_different_from_original_lab = false
  AND handprint_lab_id IS NULL
  AND photo_lab_id IS NOT NULL;
