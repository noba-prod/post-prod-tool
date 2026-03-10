-- Update notification template copies: title, description, cta_text, email_subject, recipients
-- Based on notification-edits-10-03.csv

-- dropoff_confirmation_reminder
UPDATE public.notification_templates SET
  description = 'Confirm whether the negatives have already been delivered to the lab.',
  updated_at = now()
WHERE code = 'dropoff_confirmation_reminder';

-- dropoff_delayed
UPDATE public.notification_templates SET
  title = 'Drop-off delayed for {collectionName}',
  description = 'Coordinate with the client, photographer and rest of players to update timeline and avoid possible rush-fees.',
  cta_text = 'Check collection',
  updated_at = now()
WHERE code = 'dropoff_delayed';

-- scanning_deadline_risk
UPDATE public.notification_templates SET
  title = 'Upload low-res to share with photographer',
  description = 'The scanning deadline is approaching. Confirm whether scanning will be completed on time.',
  updated_at = now()
WHERE code = 'scanning_deadline_risk';

-- scanning_completed
UPDATE public.notification_templates SET
  title = 'Low-resolution scans are ready',
  description = 'Download low-res scans review them and share your selection with the client.',
  inapp_recipients = ARRAY['photographer']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'scanning_completed';

-- lab_shared_additional_materials
UPDATE public.notification_templates SET
  title = '{photoLabName} has shared an additional link',
  description = '{commentorName} uploaded a new link. Review photos and prepare your selection.',
  email_subject = '🆕 Low-res scanning new link shared - {collectionName} by {clientName} - {photographerName}',
  inapp_recipients = ARRAY['photographer']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'lab_shared_additional_materials';

-- scanning_delayed
UPDATE public.notification_templates SET
  title = 'Low-res scans delayed for {collectionName}',
  description = 'Coordinate with the client, photographer and rest of players to update timeline and avoid possible rush-fees.',
  updated_at = now()
WHERE code = 'scanning_delayed';

-- photographer_selection_risk
UPDATE public.notification_templates SET
  description = E'Deadline to upload the photographer''s selection is approaching. Confirm your selection is ready.',
  inapp_recipients = ARRAY['photographer']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'photographer_selection_risk';

-- photographer_selection_uploaded
UPDATE public.notification_templates SET
  title = 'Photographer has shared shooting photos',
  cta_text = 'Review photos',
  email_recipients = ARRAY['client']::notification_recipient_type[],
  inapp_recipients = ARRAY['client']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'photographer_selection_uploaded';

-- photographer_selection_delayed
UPDATE public.notification_templates SET
  title = 'Photographer selection delayed for {collectionName}',
  cta_text = 'Check collection',
  updated_at = now()
WHERE code = 'photographer_selection_delayed';

-- photographer_shared_additional_materials
UPDATE public.notification_templates SET
  title = '{photographerName} has shared an additional link',
  description = '{commentorName} uploaded a new link. Review photos and prepare your selection.',
  email_subject = '🆕 Photographer has shared new link - {collectionName} by {clientName} - {photographerName}',
  inapp_recipients = ARRAY['client']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'photographer_shared_additional_materials';

-- client_selection_delayed
UPDATE public.notification_templates SET
  title = 'Client selection delayed for {collectionName}',
  updated_at = now()
WHERE code = 'client_selection_delayed';

-- client_selection_morning_reminder
UPDATE public.notification_templates SET
  title = 'Reminder: you have to upload today your selection',
  description = 'Upload your selection today before {slotDeadlineTime}. Make sure to share your link before deadline to avoid delays on the collection.',
  cta_text = 'Upload selection',
  updated_at = now()
WHERE code = 'client_selection_morning_reminder';

-- client_selection_urgent_reminder
UPDATE public.notification_templates SET
  title = 'Get your selection ready for HR!',
  description = 'Deadline is approaching. Complete your selection to move photos to high resolution.',
  cta_text = 'Upload selection',
  inapp_recipients = ARRAY['client']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'client_selection_urgent_reminder';

-- client_selection_confirmed
UPDATE public.notification_templates SET
  title = 'Review client selection and validate it',
  description = 'Client has submitted the final image selection. Review it, validate it and give instructions to handprint lab to proceed with high-resolution processing.',
  cta_text = 'Validate selection',
  inapp_recipients = ARRAY['photographer']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'client_selection_confirmed';

-- photographer_review_risk
UPDATE public.notification_templates SET
  title = 'Photographer review deadline is coming',
  description = 'Deadline for validating client selection is approaching. Please confirm everything is ok and add comments for high-res.',
  inapp_recipients = ARRAY['photographer']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'photographer_review_risk';

-- photographer_check_delayed
UPDATE public.notification_templates SET
  title = 'Photographer review delayed for {collectionName}',
  description = 'Coordinate with the client, photographer and rest of players to update timeline and avoid possible rush-fees.',
  updated_at = now()
WHERE code = 'photographer_check_delayed';

-- photographer_check_ready_for_hr
UPDATE public.notification_templates SET
  description = 'Check if there are photographer comments before converting client selection to HR.',
  cta_text = 'Upload high-res',
  email_subject = '✅ Client selection ready for high-res - {collectionName} by {clientName} - {photographerName}',
  inapp_recipients = ARRAY['handprint_lab']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'photographer_check_ready_for_hr';

-- highres_deadline_risk
UPDATE public.notification_templates SET
  description = 'Deadline for uploading the client selection in high-resolution is approaching. Make sure to upload selection in time!',
  cta_text = 'Upload high-res',
  inapp_recipients = ARRAY['handprint_lab']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'highres_deadline_risk';

-- highres_delayed
UPDATE public.notification_templates SET
  title = 'High-res delayed for {collectionName}',
  description = 'Coordinate with the client, photographer and rest of players to update timeline and avoid possible rush-fees.',
  cta_text = 'Check collection',
  updated_at = now()
WHERE code = 'highres_delayed';

-- highres_ready
UPDATE public.notification_templates SET
  description = 'Check out high-resolution images and leave any comments if needed to get finals ready.',
  email_subject = '✅ Client selection is ready in high resolution - {collectionName} by {clientName} - {photographerName}',
  inapp_recipients = ARRAY['photographer']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'highres_ready';

-- edition_request_ready
UPDATE public.notification_templates SET
  title = E'Retouch request ready \u2013 start edits for {collectionName}',
  inapp_recipients = ARRAY['retouch_studio']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'edition_request_ready';

-- edition_request_delayed
UPDATE public.notification_templates SET
  title = 'Retouch request delayed for {collectionName}',
  description = 'Coordinate with the client, photographer and rest of players to update timeline and avoid possible rush-fees.',
  updated_at = now()
WHERE code = 'edition_request_delayed';

-- edition_completion_check
UPDATE public.notification_templates SET
  title = 'Retouch request and comments at risk',
  description = 'Deadline for giving retouch comments and instructions is approaching. Confirm everything is ok for final edition.',
  cta_text = 'Add feedback',
  inapp_recipients = ARRAY['photographer']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'edition_completion_check';

-- final_edits_completed
UPDATE public.notification_templates SET
  title = 'Final edits ready for {collectionName}',
  description = 'Review final edits, give feedback if needed, and prepare to share the final photos with the client.',
  cta_text = 'Check edits',
  inapp_recipients = ARRAY['photographer']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'final_edits_completed';

-- final_edits_at_risk
UPDATE public.notification_templates SET
  cta_text = 'Upload final edits',
  inapp_recipients = ARRAY['retouch_studio']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'final_edits_at_risk';

-- final_edits_delayed
UPDATE public.notification_templates SET
  title = 'Final edits delayed for {collectionName}',
  cta_text = 'Check collection',
  updated_at = now()
WHERE code = 'final_edits_delayed';

-- retouch_studio_shared_additional_materials (moved from step 10 to step 9)
UPDATE public.notification_templates SET
  step = 9,
  step_name = 'Final edits',
  title = '{retouchStudioName} has shared an additional link',
  description = '{commentorName} uploaded a new link. Review photos and prepare your selection.',
  email_subject = '🆕 {retouchStudioName} has shared an additional link - {collectionName} by {clientName} - {photographerName}',
  inapp_recipients = ARRAY['photographer']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'retouch_studio_shared_additional_materials';

-- photographer_review_reminder
UPDATE public.notification_templates SET
  title = 'Photographer last check at risk',
  description = 'Review final edits, give feedback and prepare to share the finals with the client.',
  cta_text = 'Share final selection',
  inapp_recipients = ARRAY['photographer']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'photographer_review_reminder';

-- photographer_edits_approved
UPDATE public.notification_templates SET
  title = 'Finals are ready for {collectionName}',
  description = 'The photographer has approved the final selection. Check now and give feedback before completing the collection.',
  cta_text = 'Check finals',
  email_subject = '✅ Finals are ready for {collectionName} by {clientName} - {photographerName}',
  updated_at = now()
WHERE code = 'photographer_edits_approved';

-- photographer_review_delayed
UPDATE public.notification_templates SET
  title = 'Photographer last check is delayed for {collectionName}',
  description = 'Coordinate with the client, photographer and rest of players to update timeline and avoid possible rush-fees.',
  cta_text = 'Check collection',
  updated_at = now()
WHERE code = 'photographer_review_delayed';

-- client_confirmation_reminder
UPDATE public.notification_templates SET
  title = 'Is collection {collectionName} finished?',
  description = 'Make sure all finals are ok and mark confirm the completion of the collection or add comments requesting additional photos.',
  email_recipients = ARRAY['producer', 'client']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'client_confirmation_reminder';
