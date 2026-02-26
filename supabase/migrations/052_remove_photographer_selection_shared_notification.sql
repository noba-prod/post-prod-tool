-- ============================================================================
-- Migration 052: Remove photographer_selection_shared notification
-- Description: Disable photographer_selection_shared template. Step 4 now
--   uses only photographer_selection_uploaded for "Selection uploaded and ready".
-- ============================================================================

UPDATE public.notification_templates
SET is_active = false,
    updated_at = now()
WHERE code = 'photographer_selection_shared';
