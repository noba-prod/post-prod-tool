-- ============================================================================
-- Migration 053: Client selection notifications
-- 1) photographer_shared_additional_materials: When photographer uploads
--    additional selection (after first), notify client (email + in-app).
-- 2) client_selection_delayed: When photographer_selection_deadline_missed
--    fires, notify producer about client selection being delayed.
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
) VALUES
(
  'photographer_shared_additional_materials',
  5,
  'Client selection',
  'Photographer has shared additional materials',
  'Photographer has shared an additional link. Review the photos and create a selection to move LR to HR and prepare finals',
  'Review photos',
  '/collections/{collectionId}?step=client_selection',
  'on'::notification_trigger_type,
  'photographer_selection_shared',
  0,
  NULL,
  ARRAY['client'::notification_recipient_type],
  ARRAY['client'::notification_recipient_type],
  true
),
(
  'client_selection_delayed',
  5,
  'Client selection',
  '🚨 Client selection delayed for [collectionName]',
  'Coordinate with the client, photographer and rest of players to update timeline and avoid possible rush-fees.',
  'Check progress',
  '/collections/{collectionId}?step=client_selection',
  'on'::notification_trigger_type,
  'photographer_selection_deadline_missed',
  0,
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
