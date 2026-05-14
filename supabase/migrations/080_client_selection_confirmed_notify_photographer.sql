-- ============================================================================
-- Migration 080: client_selection_confirmed — notify Photographer + HR lab
-- ============================================================================
-- CONTEXT
--   Migration 078 removed the "Photographer Review" step and routed the analog
--   `client_selection_confirmed` template to `handprint_lab` only so the HR /
--   photo lab could proceed with high-res work.
--
--   Without Photographer Review, photographers still need visibility into
--   Client Selection (review client links, leave notes for the lab). Product
--   requirement: reuse the SAME notification_templates row — extend
--   email_recipients / inapp_recipients — do NOT create a second template.
--
-- BACKWARD COMPATIBILITY
--   Copy, CTA text, trigger_event, trigger_condition (`has_handprint`), and lab
--   deep-links are unchanged for handprint_lab recipients. Photographer is added;
--   per-recipient CTA routing is handled in NotificationsService via
--   TEMPLATE_STEP_SLUG_BY_RECIPIENT (photographer → client_selection).
-- ============================================================================

UPDATE public.notification_templates
SET
  email_recipients = ARRAY[
    'handprint_lab'::notification_recipient_type,
    'photographer'::notification_recipient_type
  ],
  inapp_recipients = ARRAY[
    'handprint_lab'::notification_recipient_type,
    'photographer'::notification_recipient_type
  ],
  updated_at = now()
WHERE code = 'client_selection_confirmed';
