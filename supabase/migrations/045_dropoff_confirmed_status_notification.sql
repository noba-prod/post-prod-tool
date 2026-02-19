-- ============================================================================
-- Migration 045: Drop-off confirmed status notification for producer
-- Description: Adds an in-app template triggered on dropoff_confirmed, with
-- dynamic title/subtitle resolved from metadata.canMeetDeadline (YES/NO).
-- ============================================================================

INSERT INTO public.notification_templates (
  code,
  step,
  step_name,
  title,
  description,
  cta_text,
  cta_url_template,
  trigger_type,
  trigger_event,
  trigger_offset_minutes,
  trigger_condition,
  email_recipients,
  inapp_recipients
) VALUES (
  'dropoff_confirmed_status',
  2,
  'Negatives drop off',
  '{dropoffConfirmationTitle}',
  '{dropoffConfirmationSubtitle}',
  'Check collection',
  '/collections/{collectionId}?step=low_res_scanning',
  'on'::notification_trigger_type,
  'dropoff_confirmed',
  0,
  NULL,
  ARRAY[]::notification_recipient_type[],
  ARRAY['producer'::notification_recipient_type]
)
ON CONFLICT (code) DO UPDATE SET
  step = EXCLUDED.step,
  step_name = EXCLUDED.step_name,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  cta_text = EXCLUDED.cta_text,
  cta_url_template = EXCLUDED.cta_url_template,
  trigger_type = EXCLUDED.trigger_type,
  trigger_event = EXCLUDED.trigger_event,
  trigger_offset_minutes = EXCLUDED.trigger_offset_minutes,
  trigger_condition = EXCLUDED.trigger_condition,
  email_recipients = EXCLUDED.email_recipients,
  inapp_recipients = EXCLUDED.inapp_recipients,
  is_active = true,
  updated_at = now();
