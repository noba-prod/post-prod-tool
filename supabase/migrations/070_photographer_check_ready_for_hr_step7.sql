-- Migration 070: photographer_check_ready_for_hr — redirect to step 7 (Handprint to high-res)
--
-- This notification is for handprint_lab when photographer validates client selection.
-- Previously redirected to step 6 (Photographer review); should redirect to step 7
-- (Handprint to high-res) where the lab uploads high-res.

UPDATE public.notification_templates
SET
  step = 7,
  step_name = 'Handprint to high-res',
  cta_url_template = '/collections/{collectionId}?step=handprint_high_res',
  updated_at = now()
WHERE code = 'photographer_check_ready_for_hr';
