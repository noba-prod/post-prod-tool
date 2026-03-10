-- Delete 4 notification templates that are no longer needed:
-- 1. photographer_request_missing_photos (step 3)
-- 2. photographer_selection_shared (step 4, already inactive)
-- 3. client_request_missing_photos (step 4)
-- 4. final_edits_request_missing_photos (step 9)

-- First, clean up any scheduled tracking entries referencing these templates
DELETE FROM public.scheduled_notification_tracking
WHERE template_id IN (
  SELECT id FROM public.notification_templates
  WHERE code IN (
    'photographer_request_missing_photos',
    'photographer_selection_shared',
    'client_request_missing_photos',
    'final_edits_request_missing_photos'
  )
);

-- Delete the templates themselves
DELETE FROM public.notification_templates
WHERE code IN (
  'photographer_request_missing_photos',
  'photographer_selection_shared',
  'client_request_missing_photos',
  'final_edits_request_missing_photos'
);
