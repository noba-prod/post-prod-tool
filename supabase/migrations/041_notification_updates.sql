-- ============================================================================
-- Migration 041: Notification Template Updates
-- Description: Expands step constraint to 11, adds new event types,
--              updates client_selection_confirmed template, inserts 7 new
--              notification templates (including step 6 Photographer review
--              and step 11 Client confirmation).
-- ============================================================================

-- 1. Expand step constraint from 9 to 11
ALTER TABLE public.notification_templates DROP CONSTRAINT notification_templates_step_check;
ALTER TABLE public.notification_templates ADD CONSTRAINT notification_templates_step_check CHECK (step >= 1 AND step <= 11);

-- 2. Add new collection event types
ALTER TYPE collection_event_type ADD VALUE IF NOT EXISTS 'photographer_request_missing_photos';
ALTER TYPE collection_event_type ADD VALUE IF NOT EXISTS 'client_request_missing_photos';
ALTER TYPE collection_event_type ADD VALUE IF NOT EXISTS 'photographer_check_deadline_missed';

-- 3. Update existing client_selection_confirmed template (delete row 9 + create row 10)
UPDATE public.notification_templates
SET
  description = 'The client has submitted the final image selection. Review it and validate to proceed with high-resolution processing.',
  cta_text = 'Validate client selection',
  email_recipients = ARRAY['photographer'::notification_recipient_type],
  inapp_recipients = ARRAY['photographer'::notification_recipient_type, 'producer'::notification_recipient_type],
  updated_at = now()
WHERE code = 'client_selection_confirmed';

-- 4. Insert 7 new notification templates
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
  inapp_recipients
) VALUES
-- Step 3: Photographer requests missing photos (dynamic {noteText})
(
  'photographer_request_missing_photos',
  3,
  'Low-res scanning',
  'Photographer is requesting missing photos',
  '{noteText}',
  'Review request',
  '/collections/{collectionId}?step=low_res_scanning',
  'on'::notification_trigger_type,
  'photographer_request_missing_photos',
  0,
  NULL,
  ARRAY['lab'::notification_recipient_type],
  ARRAY['producer'::notification_recipient_type, 'lab'::notification_recipient_type]
),
-- Step 4: Client requests missing photos (dynamic {noteText})
(
  'client_request_missing_photos',
  4,
  'Photographer selection',
  'Client is requesting missing photos',
  '{noteText}',
  'Review request',
  '/collections/{collectionId}?step=photographer_selection',
  'on'::notification_trigger_type,
  'client_request_missing_photos',
  0,
  NULL,
  ARRAY['lab'::notification_recipient_type, 'photographer'::notification_recipient_type],
  ARRAY['producer'::notification_recipient_type, 'photographer'::notification_recipient_type]
),
-- Step 6: Photographer review at risk (1h before deadline)
(
  'photographer_review_risk',
  6,
  'Photographer review',
  'Photographer review at risk',
  'The deadline for validating client selection is approaching. Please confirm everything is ok and add comments for high-res.',
  'Check HR',
  '/collections/{collectionId}?step=photographer_check',
  'before'::notification_trigger_type,
  'photographer_check_deadline',
  -60,
  NULL,
  ARRAY['photographer'::notification_recipient_type, 'producer'::notification_recipient_type],
  ARRAY['photographer'::notification_recipient_type]
),
-- Step 6: Photographer review delayed
(
  'photographer_check_delayed',
  6,
  'Photographer review',
  'Photographer review delayed for collection [ID]',
  'Photographer review is delayed. Please coordinate with the handprint lab to adjust timings.',
  'Check collection',
  '/collections/{collectionId}?step=photographer_check',
  'on'::notification_trigger_type,
  'photographer_check_deadline_missed',
  0,
  NULL,
  ARRAY['producer'::notification_recipient_type],
  ARRAY['producer'::notification_recipient_type]
),
-- Step 6: Client selection ready for HR (on photographer check approved)
(
  'photographer_check_ready_for_hr',
  6,
  'Photographer review',
  'Client selection is ready for HR',
  'Check photographer comments and validations before converting client selection to HR.',
  'Review comments',
  '/collections/{collectionId}?step=photographer_check',
  'on'::notification_trigger_type,
  'photographer_check_approved',
  0,
  NULL,
  ARRAY['hand_print_lab'::notification_recipient_type],
  ARRAY['hand_print_lab'::notification_recipient_type, 'producer'::notification_recipient_type]
),
-- Step 9: Photographer requests new edits (dynamic {noteText}, same trigger as client_request_missing_photos)
(
  'final_edits_request_missing_photos',
  9,
  'Final edits',
  'Photographer is requesting new edits',
  '{noteText}',
  'Review request',
  '/collections/{collectionId}?step=final_edits',
  'on'::notification_trigger_type,
  'client_request_missing_photos',
  0,
  NULL,
  ARRAY['lab'::notification_recipient_type, 'photographer'::notification_recipient_type],
  ARRAY['producer'::notification_recipient_type, 'photographer'::notification_recipient_type]
),
-- Step 11: Client confirmation reminder (1h after project deadline, if not confirmed)
(
  'client_confirmation_reminder',
  11,
  'Client confirmation',
  'Is collection finished?',
  'Has the client received and confirmed finals?',
  'Collection finished',
  '/collections/{collectionId}?step=client_confirmation',
  'if'::notification_trigger_type,
  'project_deadline',
  60,
  'client_not_confirmed_completion',
  ARRAY['producer'::notification_recipient_type],
  ARRAY['producer'::notification_recipient_type]
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
  updated_at = now();
