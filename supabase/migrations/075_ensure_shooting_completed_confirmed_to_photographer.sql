-- ============================================================================
-- Migration 075: Ensure shooting_completed_confirmed_to_photographer is correctly configured
-- Description: Fixes notification 59319e73-b339-41fa-953b-e4fc39d6b60c (or template
--   with code shooting_completed_confirmed_to_photographer). When producer confirms
--   step 1 (Shooting) for Digital collections, the photographer must receive
--   notification to upload their selection. This migration ensures the template
--   exists and has the correct trigger_type, trigger_event, trigger_condition,
--   and recipients.
-- ============================================================================

-- Ensure shooting_completed_confirmed_to_photographer exists and is correctly configured
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
  'Shooting has ended – share your selection',
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
