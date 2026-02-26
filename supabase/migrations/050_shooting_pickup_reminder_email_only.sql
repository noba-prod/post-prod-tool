-- ============================================================================
-- Migration 050: shooting_pickup_reminder — email-only (no in-app)
-- Description: Clear inapp_recipients for shooting_pickup_reminder; this
--   notification should only be sent by email, not in-app.
-- ============================================================================

UPDATE public.notification_templates
SET inapp_recipients = ARRAY[]::notification_recipient_type[]
WHERE code = 'shooting_pickup_reminder';
