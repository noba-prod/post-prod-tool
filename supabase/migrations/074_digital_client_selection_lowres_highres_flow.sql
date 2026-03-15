-- ============================================================================
-- Migration 074: Digital collection flow – client selection → low-res to high-res → client confirmation
-- Description: For Digital collections (low_res_to_high_res_digital = true) only:
--   1. client_selection_confirmed: restrict to Analog (has_handprint)
--   2. client_selection_confirmed_digital: when client uploads step 5, notify photographer, link to step 7
--   3. highres_ready: restrict to Analog (has_handprint)
--   4. highres_ready_digital: when photographer uploads step 7, notify client, link to step 11
-- ============================================================================

-- 1) client_selection_confirmed: Analog only (has_handprint)
UPDATE public.notification_templates
SET trigger_condition = 'has_handprint',
    updated_at = now()
WHERE code = 'client_selection_confirmed';

-- 2) client_selection_confirmed_digital: Digital only – photographer, link to step 7 (Low-res to high-res)
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
  'client_selection_confirmed_digital',
  5,
  'Client selection',
  'Client selection ready – convert to high-res',
  'The client has submitted the final image selection. Convert it to high-resolution and upload the link.',
  '✅ Client selection ready – {collectionName} by {clientName} – {photographerName}',
  'Upload high-res',
  '/collections/{collectionId}?step=handprint_high_res',
  'on'::notification_trigger_type,
  'client_selection_confirmed',
  0,
  'is_digital',
  ARRAY['photographer'::notification_recipient_type],
  ARRAY['photographer'::notification_recipient_type],
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

-- 3) highres_ready: Analog only (has_handprint)
UPDATE public.notification_templates
SET trigger_condition = 'has_handprint',
    updated_at = now()
WHERE code = 'highres_ready';

-- 4) highres_ready_digital: Digital only – client, link to step 11 (Client confirmation)
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
  'highres_ready_digital',
  7,
  'Low-res to high-res',
  'High-res ready for review',
  'The photographer has uploaded the high-resolution selection. Review and confirm the collection.',
  '✅ High-res ready – {collectionName} by {clientName} – {photographerName}',
  'Confirm collection',
  '/collections/{collectionId}?step=client_confirmation',
  'on'::notification_trigger_type,
  'highres_ready',
  0,
  'is_digital',
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
