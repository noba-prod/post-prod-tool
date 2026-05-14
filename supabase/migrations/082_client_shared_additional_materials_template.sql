-- ============================================================================
-- Migration 082: client_shared_additional_materials notification template
-- ============================================================================
-- Insert the notification template used when the client uploads additional
-- links/notes after the first `client_selection_confirmed`.
--
-- Mirrors the existing `photographer_shared_additional_materials` template:
--   * Same `_shared_additional_materials` suffix → the notifications service
--     treats it as an "additional materials" template (exempt from the
--     step-completed guard via isAdditionalMaterialsTemplateCode) and uses
--     `{commentorName}` in the title via USER_ACTOR_TITLE_TEMPLATE_CODES.
--   * trigger_event = `client_selection_shared` (added in migration 081).
--   * Same recipients as `client_selection_confirmed`: HR lab + photographer.
--   * Per-recipient navigation is handled in NotificationsService via
--     TEMPLATE_STEP_SLUG_BY_RECIPIENT (handprint_lab → handprint_high_res,
--     photographer → client_selection). The default CTA below targets the lab.
--   * trigger_condition = `has_handprint` so this only fires on analog flows,
--     matching `client_selection_confirmed`. Digital flows do not currently
--     surface a second-link path.
--
-- ON CONFLICT (code) DO NOTHING keeps the migration safely re-runnable.
--
-- ROLLOUT
--   Applied to noba-prod-dev (project prneklhdbujxmbuswplp). Apply to
--   noba-prod-prod (project kgmbxzpevtwcgolhwuud) once the related code change
--   that fires `client_selection_shared` is deployed there.
-- ============================================================================

INSERT INTO public.notification_templates (
  id,
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
  is_active,
  email_subject
) VALUES (
  gen_random_uuid(),
  'client_shared_additional_materials',
  5,
  'Client selection',
  '{commentorName} has shared an additional link',
  '{commentorName} uploaded a new client selection link. Review it and continue with high-resolution processing.',
  'View collection',
  '/collections/{collectionId}?step=handprint_high_res',
  'on',
  'client_selection_shared',
  0,
  'has_handprint',
  ARRAY['handprint_lab', 'photographer']::notification_recipient_type[],
  ARRAY['handprint_lab', 'photographer']::notification_recipient_type[],
  true,
  '🆕 Client shared additional materials - {collectionName} by {clientName} - {photographerName}'
)
ON CONFLICT (code) DO NOTHING;
