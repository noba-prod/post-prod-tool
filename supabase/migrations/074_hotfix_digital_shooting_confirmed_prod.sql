-- ============================================================================
-- Migration 074: Hotfix digital shooting confirmation in production
-- Description:
--   - Add missing enum value: shooting_completed_confirmed
--   - Ensure digital shooting templates exist
--   - Keep analog reminder constrained to handprint flows
-- ============================================================================

ALTER TYPE public.collection_event_type ADD VALUE IF NOT EXISTS 'shooting_completed_confirmed';

UPDATE public.notification_templates
SET trigger_condition = 'has_handprint',
    updated_at = now()
WHERE code = 'shooting_pickup_reminder';

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
  'shooting_pickup_reminder_digital',
  1,
  'Shooting',
  'Has the shooting been completed?',
  'Confirm that the shooting has ended so the photographer can upload their selection.',
  '📋 Shooting reminder - {collectionName} by {clientName} - {photographerName}',
  'Confirm shooting ended',
  '/collections/{collectionId}?step=shooting',
  'before'::notification_trigger_type,
  'shooting_end',
  -30,
  'is_digital',
  ARRAY['producer'::notification_recipient_type],
  ARRAY['producer'::notification_recipient_type],
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
  'shooting_completed_confirmed_to_photographer',
  4,
  'Photographer selection',
  'Shooting has ended - share your selection',
  'The shooting has been confirmed as complete. Share your photo selection with the client.',
  '📸 Share your selection - {collectionName} by {clientName}',
  'Upload selection',
  '/collections/{collectionId}?step=photographer_selection',
  'on'::notification_trigger_type,
  'shooting_completed_confirmed',
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
