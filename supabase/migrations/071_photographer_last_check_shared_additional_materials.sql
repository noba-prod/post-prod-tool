-- ============================================================================
-- Migration 071: photographer_last_check_shared_additional_materials notification
-- Description: When photographer uploads additional links in step 10 (Photographer
--   last check) after the step is already completed, notify client (email + in-app).
-- Trigger: on photographer_last_check_shared_additional_materials event
-- ============================================================================

ALTER TYPE collection_event_type ADD VALUE IF NOT EXISTS 'photographer_last_check_shared_additional_materials';

INSERT INTO public.notification_templates (
  code,
  step,
  step_name,
  title,
  description,
  email_subject,
  cta_text,
  cta_url_template,
  trigger_type,
  trigger_event,
  trigger_offset_minutes,
  trigger_condition,
  email_recipients,
  inapp_recipients,
  is_active
) VALUES (
  'photographer_last_check_shared_additional_materials',
  10,
  'Photographer last check',
  '{photographerName} has shared an additional link',
  '{commentorName} uploaded a new link. Review the additional photos before confirming the collection.',
  '🆕 Photographer has shared additional photos - {collectionName} by {clientName} - {photographerName}',
  'Review new link',
  '/collections/{collectionId}?step=client_confirmation',
  'on'::notification_trigger_type,
  'photographer_last_check_shared_additional_materials',
  0,
  NULL,
  ARRAY['client'::notification_recipient_type],
  ARRAY['client'::notification_recipient_type],
  true
)
ON CONFLICT (code) DO UPDATE SET
  step = EXCLUDED.step,
  step_name = EXCLUDED.step_name,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  email_subject = EXCLUDED.email_subject,
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
