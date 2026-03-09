-- Add email_subject column to notification_templates for email subject line templates
ALTER TABLE public.notification_templates
ADD COLUMN email_subject text NULL;

-- Populate email_subject for all existing templates
-- Format: emoji + stepName + reason - {collectionName} by {clientName} - {photographerName}

-- Step 1: Shooting
UPDATE public.notification_templates SET email_subject = '📋 Shooting pickup reminder - {collectionName} by {clientName} - {photographerName}' WHERE code = 'shooting_pickup_reminder';

-- Step 2: Negatives Drop-off
UPDATE public.notification_templates SET email_subject = '📦 Negatives drop-off upcoming - {collectionName} by {clientName} - {photographerName}' WHERE code = 'dropoff_upcoming';
UPDATE public.notification_templates SET email_subject = '📦 Negatives drop-off reminder - {collectionName} by {clientName} - {photographerName}' WHERE code = 'dropoff_confirmation_reminder';
UPDATE public.notification_templates SET email_subject = '🚨 Negatives drop off delayed - {collectionName} by {clientName} - {photographerName}' WHERE code = 'dropoff_delayed';
UPDATE public.notification_templates SET email_subject = '📦 Negatives drop off confirmed - {collectionName} by {clientName} - {photographerName}' WHERE code = 'dropoff_confirmed_status';

-- Step 3: Low-res Scanning
UPDATE public.notification_templates SET email_subject = '⚠️ Low-res scanning at risk - {collectionName} by {clientName} - {photographerName}' WHERE code = 'scanning_deadline_risk';
UPDATE public.notification_templates SET email_subject = '✅ Low-res scanning ready - {collectionName} by {clientName} - {photographerName}' WHERE code = 'scanning_completed';
UPDATE public.notification_templates SET email_subject = '📎 Low-res scanning materials shared - {collectionName} by {clientName} - {photographerName}' WHERE code = 'lab_shared_additional_materials';
UPDATE public.notification_templates SET email_subject = '🚨 Low-res scanning delayed - {collectionName} by {clientName} - {photographerName}' WHERE code = 'scanning_delayed';
UPDATE public.notification_templates SET email_subject = '📷 Low-res scanning missing photos - {collectionName} by {clientName} - {photographerName}' WHERE code = 'photographer_request_missing_photos';

-- Step 4: Photographer Selection
UPDATE public.notification_templates SET email_subject = '⚠️ Photographer selection at risk - {collectionName} by {clientName} - {photographerName}' WHERE code = 'photographer_selection_risk';
UPDATE public.notification_templates SET email_subject = '✅ Photographer selection ready - {collectionName} by {clientName} - {photographerName}' WHERE code = 'photographer_selection_uploaded';
UPDATE public.notification_templates SET email_subject = '🚨 Photographer selection delayed - {collectionName} by {clientName} - {photographerName}' WHERE code = 'photographer_selection_delayed';
UPDATE public.notification_templates SET email_subject = '📷 Photographer selection missing photos - {collectionName} by {clientName} - {photographerName}' WHERE code = 'client_request_missing_photos';

-- Step 5: Client Selection
UPDATE public.notification_templates SET email_subject = '📎 Client selection materials shared - {collectionName} by {clientName} - {photographerName}' WHERE code = 'photographer_shared_additional_materials';
UPDATE public.notification_templates SET email_subject = '🚨 Client selection delayed - {collectionName} by {clientName} - {photographerName}' WHERE code = 'client_selection_delayed';
UPDATE public.notification_templates SET email_subject = '📋 Client selection reminder - {collectionName} by {clientName} - {photographerName}' WHERE code = 'client_selection_morning_reminder';
UPDATE public.notification_templates SET email_subject = '⚠️ Client selection at risk - {collectionName} by {clientName} - {photographerName}' WHERE code = 'client_selection_urgent_reminder';
UPDATE public.notification_templates SET email_subject = '✅ Client selection ready - {collectionName} by {clientName} - {photographerName}' WHERE code = 'client_selection_confirmed';

-- Step 6: Photographer Review
UPDATE public.notification_templates SET email_subject = '⚠️ Photographer review at risk - {collectionName} by {clientName} - {photographerName}' WHERE code = 'photographer_review_risk';
UPDATE public.notification_templates SET email_subject = '🚨 Photographer review delayed - {collectionName} by {clientName} - {photographerName}' WHERE code = 'photographer_check_delayed';
UPDATE public.notification_templates SET email_subject = '✅ Photographer review ready - {collectionName} by {clientName} - {photographerName}' WHERE code = 'photographer_check_ready_for_hr';

-- Step 7: Low-res to High-res
UPDATE public.notification_templates SET email_subject = '⚠️ Low-res to high-res at risk - {collectionName} by {clientName} - {photographerName}' WHERE code = 'highres_deadline_risk';
UPDATE public.notification_templates SET email_subject = '🚨 Low-res to high-res delayed - {collectionName} by {clientName} - {photographerName}' WHERE code = 'highres_delayed';
UPDATE public.notification_templates SET email_subject = '✅ Low-res to high-res ready - {collectionName} by {clientName} - {photographerName}' WHERE code = 'highres_ready';

-- Step 8: Retouch Request
UPDATE public.notification_templates SET email_subject = '✅ Retouch request ready - {collectionName} by {clientName} - {photographerName}' WHERE code = 'edition_request_ready';
UPDATE public.notification_templates SET email_subject = '🚨 Retouch request delayed - {collectionName} by {clientName} - {photographerName}' WHERE code = 'edition_request_delayed';
UPDATE public.notification_templates SET email_subject = '⚠️ Retouch request at risk - {collectionName} by {clientName} - {photographerName}' WHERE code = 'edition_completion_check';

-- Step 9: Final Edits
UPDATE public.notification_templates SET email_subject = '✅ Final edits ready - {collectionName} by {clientName} - {photographerName}' WHERE code = 'final_edits_completed';
UPDATE public.notification_templates SET email_subject = '⚠️ Final edits at risk - {collectionName} by {clientName} - {photographerName}' WHERE code = 'final_edits_at_risk';
UPDATE public.notification_templates SET email_subject = '🚨 Final edits delayed - {collectionName} by {clientName} - {photographerName}' WHERE code = 'final_edits_delayed';
UPDATE public.notification_templates SET email_subject = '📷 Final edits new edits requested - {collectionName} by {clientName} - {photographerName}' WHERE code = 'final_edits_request_missing_photos';

-- Step 10: Photographer Last Check
UPDATE public.notification_templates SET email_subject = '📎 Photographer last check materials shared - {collectionName} by {clientName} - {photographerName}' WHERE code = 'retouch_studio_shared_additional_materials';
UPDATE public.notification_templates SET email_subject = '⚠️ Photographer last check at risk - {collectionName} by {clientName} - {photographerName}' WHERE code = 'photographer_review_reminder';
UPDATE public.notification_templates SET email_subject = '✅ Photographer last check ready - {collectionName} by {clientName} - {photographerName}' WHERE code = 'photographer_edits_approved';
UPDATE public.notification_templates SET email_subject = '🚨 Photographer last check delayed - {collectionName} by {clientName} - {photographerName}' WHERE code = 'photographer_review_delayed';

-- Step 11: Client Confirmation
UPDATE public.notification_templates SET email_subject = '📋 Client confirmation reminder - {collectionName} by {clientName} - {photographerName}' WHERE code = 'client_confirmation_reminder';
