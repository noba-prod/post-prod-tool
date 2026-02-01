-- ============================================================================
-- Migration 017: Notification Templates Seed Data
-- Description: Seeds the 24 notification templates from the CSV configuration
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
  inapp_recipients
) VALUES
-- ==========================================================================
-- Step 1: Shooting
-- ==========================================================================
(
  'shooting_pickup_reminder',
  1,
  'Shooting',
  'Are shooting negatives ready for drop-off?',
  'Have the negatives been picked up and prepared for delivery to the lab?',
  'Confirm pickup',
  '/collections/{collectionId}?step=shooting',
  'before'::notification_trigger_type,
  'shooting_end',
  -30,
  NULL,
  ARRAY['producer'::notification_recipient_type],
  ARRAY['producer'::notification_recipient_type]
),

-- ==========================================================================
-- Step 2: Negatives Drop-off
-- ==========================================================================
(
  'dropoff_upcoming',
  2,
  'Negatives drop off',
  'Upcoming negatives drop-off',
  'Negatives are on their way to the lab. Get ready and confirm that everything is ready to receive them.',
  'Confirm drop-off',
  '/collections/{collectionId}?step=negatives_dropoff',
  'on'::notification_trigger_type,
  'negatives_pickup_marked',
  0,
  NULL,
  ARRAY['lab'::notification_recipient_type],
  ARRAY['lab'::notification_recipient_type]
),
(
  'dropoff_confirmation_reminder',
  2,
  'Negatives drop off',
  'Have negatives been dropped off?',
  'Please confirm whether the negatives have already been delivered to the lab.',
  'Confirm drop-off',
  '/collections/{collectionId}?step=negatives_dropoff',
  'if'::notification_trigger_type,
  'dropoff_deadline',
  120,
  'negatives_not_confirmed',
  ARRAY['lab'::notification_recipient_type, 'producer'::notification_recipient_type],
  ARRAY['lab'::notification_recipient_type, 'producer'::notification_recipient_type]
),
(
  'dropoff_delayed',
  2,
  'Negatives drop off',
  'Drop-off delayed for collection [ID]',
  'The collection is delayed compared to the original plan. Please coordinate with the lab to review timings and possible rush options.',
  NULL,
  '/collections/{collectionId}?step=negatives_dropoff',
  'on'::notification_trigger_type,
  'dropoff_deadline_missed',
  0,
  NULL,
  ARRAY['producer'::notification_recipient_type],
  ARRAY['producer'::notification_recipient_type]
),

-- ==========================================================================
-- Step 3: Low-res Scanning
-- ==========================================================================
(
  'scanning_deadline_risk',
  3,
  'Low-res scanning',
  'Scanning deadline at risk',
  'The scanning deadline is approaching. Please confirm whether scanning will be completed on time.',
  'Upload low-res',
  '/collections/{collectionId}?step=low_res_scanning',
  'before'::notification_trigger_type,
  'scanning_deadline',
  -60,
  NULL,
  ARRAY['lab'::notification_recipient_type],
  ARRAY['producer'::notification_recipient_type]
),
(
  'scanning_completed',
  3,
  'Low-res scanning',
  'Scanning completed',
  'Low-resolution scans are ready. Please review them and prepare the selection for the client.',
  'Review low-res',
  '/collections/{collectionId}?step=low_res_scanning',
  'on'::notification_trigger_type,
  'scanning_completed',
  0,
  NULL,
  ARRAY['photographer'::notification_recipient_type, 'producer'::notification_recipient_type],
  ARRAY['photographer'::notification_recipient_type, 'producer'::notification_recipient_type]
),
(
  'scanning_delayed',
  3,
  'Low-res scanning',
  'Low-res scanning delayed for collection [ID]',
  'The collection is delayed. Please align with the photographer and review updated timelines or rush options.',
  NULL,
  '/collections/{collectionId}?step=low_res_scanning',
  'on'::notification_trigger_type,
  'scanning_deadline_missed',
  0,
  NULL,
  ARRAY['producer'::notification_recipient_type],
  ARRAY['producer'::notification_recipient_type]
),

-- ==========================================================================
-- Step 4: Photographer Selection
-- ==========================================================================
(
  'photographer_selection_risk',
  4,
  'Photographer selection',
  'Photographer selection at risk',
  'The deadline to upload the photographer''s selection is approaching. Please confirm that the selection is ready.',
  'Upload selection',
  '/collections/{collectionId}?step=photographer_selection',
  'before'::notification_trigger_type,
  'photographer_selection_deadline',
  -60,
  NULL,
  ARRAY['photographer'::notification_recipient_type, 'producer'::notification_recipient_type],
  ARRAY['photographer'::notification_recipient_type, 'producer'::notification_recipient_type]
),
(
  'photographer_selection_shared',
  4,
  'Photographer selection',
  'Selection shared with client',
  'The photographer has shared a first image selection with the client for review.',
  'Review selection',
  '/collections/{collectionId}?step=photographer_selection',
  'on'::notification_trigger_type,
  'photographer_selection_shared',
  0,
  NULL,
  ARRAY['client'::notification_recipient_type],
  ARRAY['client'::notification_recipient_type]
),
(
  'photographer_selection_delayed',
  4,
  'Photographer selection',
  'Photographer selection delayed for collection [ID]',
  'The collection is delayed. Please coordinate with the client and photographer to update the timeline.',
  NULL,
  '/collections/{collectionId}?step=photographer_selection',
  'on'::notification_trigger_type,
  'photographer_selection_deadline_missed',
  0,
  NULL,
  ARRAY['producer'::notification_recipient_type],
  ARRAY['producer'::notification_recipient_type]
),

-- ==========================================================================
-- Step 5: Client Selection
-- ==========================================================================
(
  'client_selection_morning_reminder',
  5,
  'Client selection',
  'Client selection reminder',
  'Please complete the final image selection before the deadline.',
  'Upload final selection',
  '/collections/{collectionId}?step=client_selection',
  'first_time'::notification_trigger_type,
  'client_selection_deadline',
  0,
  'morning_reminder',
  ARRAY['client'::notification_recipient_type],
  ARRAY['client'::notification_recipient_type]
),
(
  'client_selection_urgent_reminder',
  5,
  'Client selection',
  'Client selection reminder',
  'Please complete the final image selection before the deadline.',
  'Upload final selection',
  '/collections/{collectionId}?step=client_selection',
  'if'::notification_trigger_type,
  'client_selection_deadline',
  -60,
  'selection_not_completed',
  ARRAY['client'::notification_recipient_type, 'producer'::notification_recipient_type],
  ARRAY['client'::notification_recipient_type, 'producer'::notification_recipient_type]
),
(
  'client_selection_confirmed',
  5,
  'Client selection',
  'Client final selection submitted',
  'The client has submitted the final image selection. Review it and proceed with high-resolution processing.',
  'Review client selection',
  '/collections/{collectionId}?step=client_selection',
  'on'::notification_trigger_type,
  'client_selection_confirmed',
  0,
  NULL,
  ARRAY['hand_print_lab'::notification_recipient_type, 'photographer'::notification_recipient_type],
  ARRAY['hand_print_lab'::notification_recipient_type, 'photographer'::notification_recipient_type]
),

-- ==========================================================================
-- Step 6: Hand Print High-res
-- ==========================================================================
(
  'highres_deadline_risk',
  6,
  'Hand print high-res',
  'High-resolution delivery at risk',
  'The deadline for high-resolution images is approaching. Please confirm progress with the lab.',
  'Check HR',
  '/collections/{collectionId}?step=handprint_high_res',
  'before'::notification_trigger_type,
  'highres_deadline',
  -60,
  NULL,
  ARRAY['hand_print_lab'::notification_recipient_type, 'producer'::notification_recipient_type],
  ARRAY['hand_print_lab'::notification_recipient_type, 'producer'::notification_recipient_type]
),
(
  'highres_delayed',
  6,
  'Hand print high-res',
  'High-res delayed for collection [ID]',
  'High-resolution delivery is delayed. Please coordinate with the lab to adjust timings.',
  NULL,
  '/collections/{collectionId}?step=handprint_high_res',
  'on'::notification_trigger_type,
  'highres_deadline_missed',
  0,
  NULL,
  ARRAY['producer'::notification_recipient_type],
  ARRAY['producer'::notification_recipient_type]
),
(
  'highres_ready',
  6,
  'Hand print high-res',
  'High-res ready for review',
  'High-resolution images are ready. Please review them and leave any comments if needed.',
  'Check HR',
  '/collections/{collectionId}?step=handprint_high_res',
  'on'::notification_trigger_type,
  'highres_ready',
  0,
  NULL,
  ARRAY['photographer'::notification_recipient_type, 'producer'::notification_recipient_type],
  ARRAY['photographer'::notification_recipient_type, 'producer'::notification_recipient_type]
),

-- ==========================================================================
-- Step 7: Edition Request
-- ==========================================================================
(
  'edition_request_ready',
  7,
  'Edition request',
  'Edition request ready – start edits',
  'All comments and instructions are ready. Please proceed with the requested edits.',
  'Start edits',
  '/collections/{collectionId}?step=edition_request',
  'on'::notification_trigger_type,
  'edition_request_submitted',
  0,
  NULL,
  ARRAY['edition_studio'::notification_recipient_type],
  ARRAY['edition_studio'::notification_recipient_type]
),
(
  'edition_request_delayed',
  7,
  'Edition request',
  'Edition request delayed for collection [ID]',
  'The collection is delayed. Please coordinate with the edition studio to update timelines.',
  NULL,
  '/collections/{collectionId}?step=edition_request',
  'on'::notification_trigger_type,
  'edition_request_deadline_missed',
  0,
  NULL,
  ARRAY['producer'::notification_recipient_type],
  ARRAY['producer'::notification_recipient_type]
),
(
  'edition_completion_check',
  7,
  'Edition request',
  'Edits completion check',
  'Only 1 hour remains before moving to the final review. Please confirm whether edits are completed.',
  NULL,
  '/collections/{collectionId}?step=edition_request',
  'before'::notification_trigger_type,
  'final_edits_deadline',
  -60,
  NULL,
  ARRAY['edition_studio'::notification_recipient_type],
  ARRAY['edition_studio'::notification_recipient_type]
),

-- ==========================================================================
-- Step 8: Final Edits
-- ==========================================================================
(
  'final_edits_completed',
  8,
  'Final edits',
  'Edits completed',
  'Edits are complete. Please review them and prepare to share the final images with the client.',
  'Review edits',
  '/collections/{collectionId}?step=final_edits',
  'on'::notification_trigger_type,
  'final_edits_completed',
  0,
  NULL,
  ARRAY['photographer'::notification_recipient_type, 'producer'::notification_recipient_type],
  ARRAY['photographer'::notification_recipient_type, 'producer'::notification_recipient_type]
),
(
  'final_edits_delayed',
  8,
  'Final edits',
  'Final edits delayed for collection [ID]',
  'Final edits are delayed. Please review the situation and update the timeline accordingly.',
  NULL,
  '/collections/{collectionId}?step=final_edits',
  'after'::notification_trigger_type,
  'final_edits_deadline',
  60,
  NULL,
  ARRAY['producer'::notification_recipient_type],
  ARRAY['producer'::notification_recipient_type]
),

-- ==========================================================================
-- Step 9: Photographer Last Check
-- ==========================================================================
(
  'photographer_review_reminder',
  9,
  'Photographer last check',
  'Photographer review reminder',
  'Please review and approve the edited images before the deadline.',
  NULL,
  '/collections/{collectionId}?step=photographer_last_check',
  'before'::notification_trigger_type,
  'photographer_review_deadline',
  -60,
  NULL,
  ARRAY['photographer'::notification_recipient_type],
  ARRAY['photographer'::notification_recipient_type]
),
(
  'photographer_edits_approved',
  9,
  'Photographer last check',
  'Edits approved by photographer',
  'The photographer has approved the final edits. Finals are ready, check now!',
  'Share with client',
  '/collections/{collectionId}?step=photographer_last_check',
  'on'::notification_trigger_type,
  'photographer_edits_approved',
  0,
  NULL,
  ARRAY['client'::notification_recipient_type, 'producer'::notification_recipient_type],
  ARRAY['client'::notification_recipient_type, 'producer'::notification_recipient_type]
),
(
  'photographer_review_delayed',
  9,
  'Photographer last check',
  'Photographer review delayed for collection [ID]',
  'The final review is delayed. Please align on next steps and update the timeline.',
  NULL,
  '/collections/{collectionId}?step=photographer_last_check',
  'on'::notification_trigger_type,
  'photographer_review_deadline_missed',
  0,
  NULL,
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
