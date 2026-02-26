-- ============================================================================
-- Migration 056: Update notification_templates steps 6–11
-- Description: Align step numbers and step_name with collection workflow:
--   Step 6: Photographer review
--   Step 7: Low-res to high-res (renamed from Hand print high-res)
--   Step 8: Retouch request (renamed from Edition request)
--   Step 9: Final edits
--   Step 10: Photographer last check
--   Step 11: Client confirmation
-- ============================================================================

-- Step 7: Low-res to high-res (highres_* notifications move from step 6 to 7)
UPDATE public.notification_templates
SET step = 7, step_name = 'Low-res to high-res', updated_at = now()
WHERE code IN ('highres_deadline_risk', 'highres_delayed', 'highres_ready');

-- Step 8: Retouch request (edition_* notifications: step 7 → 8, rename)
UPDATE public.notification_templates
SET step = 8, step_name = 'Retouch request', updated_at = now()
WHERE code IN ('edition_request_ready', 'edition_request_delayed', 'edition_completion_check');

-- Step 9: Final edits (final_edits_* notifications: ensure step 9)
UPDATE public.notification_templates
SET step = 9, step_name = 'Final edits', updated_at = now()
WHERE code IN ('final_edits_completed', 'final_edits_delayed', 'final_edits_at_risk', 'final_edits_request_missing_photos');

-- Step 10: Photographer last check (photographer_* notifications: ensure step 10)
UPDATE public.notification_templates
SET step = 10, step_name = 'Photographer last check', updated_at = now()
WHERE code IN ('photographer_review_reminder', 'photographer_edits_approved', 'photographer_review_delayed', 'retouch_studio_shared_additional_materials');

-- Step 11: Client confirmation (already correct, ensure consistency)
UPDATE public.notification_templates
SET step = 11, step_name = 'Client confirmation', updated_at = now()
WHERE code = 'client_confirmation_reminder';
