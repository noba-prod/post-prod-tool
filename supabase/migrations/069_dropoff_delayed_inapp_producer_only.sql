-- Migration 069: dropoff_delayed in-app notification — producer only
--
-- Previously in-app notified both producer and photo_lab.
-- Now only producer receives the in-app notification.

UPDATE public.notification_templates
SET
  inapp_recipients = ARRAY['producer']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'dropoff_delayed';
