-- ============================================================================
-- Migration 098: Shooting Delayed notification
-- Description: One-shot delayed alert for Producers when Shooting is still
-- incomplete 60 minutes after shooting_end. Uses the same `after` + milestone
-- skip pattern as final_edits_delayed. Does not alter existing shooting
-- reminders or any other templates.
-- ============================================================================

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
  'shooting_delayed',
  1,
  'Shooting',
  'Shooting delayed for {collectionName}',
  'Coordinate with the client, photographer and rest of players to update timeline and avoid possible rush-fees.',
  '🚨 Shooting delayed - {collectionName} by {clientName} - {photographerName}',
  'Check collection',
  '/collections/{collectionId}?step=shooting',
  'after'::notification_trigger_type,
  'shooting_end',
  60,
  NULL,
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
