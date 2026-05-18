-- ============================================================================
-- Migration 085: Workflow reconfiguration — in-app notification template seed
-- Description: Seeds `workflow_reconfiguration_announcement` into
--              `notification_templates` so the existing trigger pipeline
--              (NotificationsService.triggerEvent → resolveRecipients) delivers
--              the in-app card to every collection participant when a producer
--              applies a structural change (plan §17).
--
-- Pre-requisites: migration 084 (`collection_workflow_reconfigured`
--                 + `agency` recipient).
-- Step value (1) is a sentinel — the constraint requires 1..11 (migration 041);
-- the template is cross-cutting and does not belong to a workflow step.
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
  'workflow_reconfiguration_announcement',
  1,
  'Workflow change',
  'Collection workflow updated',
  'The producer updated the configuration of this collection. Some steps, deadlines or participants may have changed — open the collection to review the new workflow.',
  'Review collection',
  '/collections/{collectionId}',
  'on'::notification_trigger_type,
  'collection_workflow_reconfigured',
  0,
  NULL,
  '{}'::notification_recipient_type[],
  ARRAY[
    'producer',
    'client',
    'photographer',
    'agency',
    'photo_lab',
    'handprint_lab',
    'retouch_studio'
  ]::notification_recipient_type[],
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
  is_active = EXCLUDED.is_active,
  updated_at = now();
