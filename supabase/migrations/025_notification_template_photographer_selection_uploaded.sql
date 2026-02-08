-- ============================================================================
-- Migration 025: Add notification template for photographer_selection_uploaded
-- Description: When lab uploads step 4 selection, notify producer + client
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
  'photographer_selection_uploaded',
  4,
  'Photographer selection',
  'Selection uploaded and ready',
  'The lab has uploaded the photographer selection. It is now ready for the client to review.',
  'Review selection',
  '/collections/{collectionId}?step=photographer_selection',
  'on'::notification_trigger_type,
  'photographer_selection_uploaded',
  0,
  NULL,
  ARRAY['producer'::notification_recipient_type, 'client'::notification_recipient_type],
  ARRAY['producer'::notification_recipient_type, 'client'::notification_recipient_type]
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
  updated_at = now();
