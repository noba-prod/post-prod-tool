-- ============================================================================
-- Migration 055: retouch_studio_shared_additional_materials notification
-- Description: When retouch/edition studio uploads additional finals (after
--   first upload), notify photographer (email) and photographer + producer (in-app).
-- Trigger: on retouch_studio_shared_additional_materials event
-- ============================================================================

-- Add new event type to collection_event_type enum
ALTER TYPE collection_event_type ADD VALUE IF NOT EXISTS 'retouch_studio_shared_additional_materials';

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
  inapp_recipients,
  is_active
) VALUES (
  'retouch_studio_shared_additional_materials',
  10,
  'Photographer last check',
  'Retouch studio has shared additional materials',
  'Retouch studio has shared an additional link. Review the photos and validate finals are ready',
  'Review new link',
  '/collections/{collectionId}?step=photographer_last_check',
  'on'::notification_trigger_type,
  'retouch_studio_shared_additional_materials',
  0,
  NULL,
  ARRAY['photographer'::notification_recipient_type],
  ARRAY['photographer'::notification_recipient_type, 'producer'::notification_recipient_type],
  true
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
