-- ============================================================================
-- Migration 078: Remove "Photographer Review" step (formerly step 6)
-- Description:
--   Eliminates all artifacts of the photographer_check_client_selection step
--   from analog collection workflows. After this migration the analog HP/HR
--   flow goes directly from "Client selection" (step 5) to "Low-res to high-res"
--   (step 6, formerly step 7), and the HR lab is notified instead of the
--   photographer when the client confirms their selection.
--
-- This migration ONLY targets noba-prod-dev (project ref prneklhdbujxmbuswplp).
-- Do NOT apply to noba-prod-prod (kgmbxzpevtwcgolhwuud).
--
-- NOTE: PostgreSQL does not support dropping enum values without recreating
--   the type. The values 'photographer_check_approved',
--   'photographer_check_deadline_missed' and 'photographer_review_started'
--   remain in collection_event_type but are no longer triggered or accepted
--   by the API (removed from VALID_EVENT_TYPES). They are effectively dead.
-- ============================================================================

-- 1. Drop notification templates tied to the removed step 6
--    (Keep step 9 templates: photographer_review_reminder / photographer_review_delayed)
DELETE FROM public.notification_templates
WHERE code IN (
  'photographer_review_risk',
  'photographer_check_delayed',
  'photographer_check_ready_for_hr'
);

-- 2. Reroute the analog client_selection_confirmed notification to the HR lab
--    (handprint_lab). The notification service already maps handprint_lab to
--    the correct participant via handprintIsDifferentLab (handprint_lab_id is
--    backfilled to photo_lab_id when both labs match — see migration 065).
UPDATE public.notification_templates
SET
  title = 'Client selection ready for high-res',
  description = 'Client has confirmed the final image selection. Download it and convert it to high-resolution.',
  email_subject = '✅ Client selection ready for HR - {collectionName} by {clientName} - {photographerName}',
  cta_text = 'Upload high-res',
  cta_url_template = '/collections/{collectionId}?step=handprint_high_res',
  email_recipients = ARRAY['handprint_lab']::notification_recipient_type[],
  inapp_recipients = ARRAY['handprint_lab']::notification_recipient_type[],
  updated_at = now()
WHERE code = 'client_selection_confirmed';

-- 3. Delete historical events for the removed step (dev data hygiene)
--    so existing collections in dev no longer have a "completed" step 6 marker.
DELETE FROM public.collection_events
WHERE event_type IN (
  'photographer_check_approved',
  'photographer_check_deadline_missed',
  'photographer_review_started'
);

-- 4. Drop columns associated with the removed step
ALTER TABLE public.collections
  DROP COLUMN IF EXISTS photographer_check_due_date,
  DROP COLUMN IF EXISTS photographer_check_due_time,
  DROP COLUMN IF EXISTS photographer_review_url,
  DROP COLUMN IF EXISTS photographer_review_uploaded_at,
  DROP COLUMN IF EXISTS step_notes_photographer_review;

-- 5. Reload PostgREST schema cache so the API picks up the column changes
NOTIFY pgrst, 'reload schema';
