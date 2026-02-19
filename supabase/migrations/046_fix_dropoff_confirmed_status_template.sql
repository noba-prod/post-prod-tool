-- ============================================================================
-- Migration 046: Harden dropoff_confirmed_status template config
-- Description: Ensures the template is active and keeps producer in-app recipient.
-- ============================================================================

UPDATE public.notification_templates
SET
  step = 2,
  step_name = 'Negatives drop off',
  title = '{dropoffConfirmationTitle}',
  description = '{dropoffConfirmationSubtitle}',
  cta_text = 'Check collection',
  cta_url_template = '/collections/{collectionId}?step=low_res_scanning',
  trigger_type = 'on'::notification_trigger_type,
  trigger_event = 'dropoff_confirmed',
  trigger_offset_minutes = 0,
  trigger_condition = NULL,
  email_recipients = ARRAY[]::notification_recipient_type[],
  inapp_recipients = ARRAY['producer'::notification_recipient_type],
  is_active = true,
  updated_at = now()
WHERE code = 'dropoff_confirmed_status';
