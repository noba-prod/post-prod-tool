-- ============================================================================
-- Migration 054: Final edits at risk notification
-- Description: 1 hour before final edits deadline, notify Edition Studio
--   (email) and Edition Studio + Producer (in-app) that deadline is approaching.
-- Trigger: before:final_edits_deadline:-60
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
  inapp_recipients,
  is_active
) VALUES (
  'final_edits_at_risk',
  9,
  'Final edits',
  'Final edits at risk',
  'Deadline for final edits is approaching. Make sure all photos are attached to the final upload.',
  'Give comments',
  '/collections/{collectionId}?step=final_edits',
  'before'::notification_trigger_type,
  'final_edits_deadline',
  -60,
  NULL,
  ARRAY['edition_studio'::notification_recipient_type],
  ARRAY['edition_studio'::notification_recipient_type, 'producer'::notification_recipient_type],
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
