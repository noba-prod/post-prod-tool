-- ============================================================================
-- Migration 076: edition_request_ready for Digital + Retouch
-- Description: For Digital + Retouch (photographer_request_edition = true):
--   When photographer completes merged step "Low-res to high-res and retouch request",
--   edition_request_submitted fires. We need edition_request_ready to notify retouch_studio.
--   - edition_request_ready: restrict to Analog (has_handprint)
--   - edition_request_ready_digital: Digital + Retouch only (is_digital_and_edition)
-- ============================================================================

-- 1) edition_request_ready: Analog only (has_handprint)
UPDATE public.notification_templates
SET trigger_condition = 'has_handprint',
    updated_at = now()
WHERE code = 'edition_request_ready';

-- 2) edition_request_ready_digital: Digital + Retouch only – retouch_studio, link to final_edits
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
  'edition_request_ready_digital',
  8,
  'Final edits',
  'Retouch request ready – start edits for {collectionName}',
  'All comments and instructions are ready. Please proceed with the requested edits.',
  '✅ Retouch request ready - {collectionName} by {clientName} - {photographerName}',
  'Start edits',
  '/collections/{collectionId}?step=final_edits',
  'on'::notification_trigger_type,
  'edition_request_submitted',
  0,
  'is_digital_and_edition',
  ARRAY['retouch_studio'::notification_recipient_type],
  ARRAY['retouch_studio'::notification_recipient_type],
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
