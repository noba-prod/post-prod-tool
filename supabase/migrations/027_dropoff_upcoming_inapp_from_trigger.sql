-- ============================================================================
-- Migration 027: dropoff_upcoming — in-app sent in triggerEvent (lab + producer)
-- Description: Clear inapp_recipients for dropoff_upcoming; in-app for
--   negatives_pickup_marked is now sent in code with message "Negatives are
--   on their way. Get ready to low-res scan." to Photo Lab + Producer.
-- ============================================================================

UPDATE public.notification_templates
SET inapp_recipients = ARRAY[]::notification_recipient_type[]
WHERE code = 'dropoff_upcoming';
