-- ============================================================================
-- Rollback playbook for 074 hotfix
-- NOTE:
--   PostgreSQL enum values are append-only in-place; we DO NOT remove
--   'shooting_completed_confirmed' because that is destructive/risky.
--   This rollback disables new digital notifications and restores the analog
--   reminder condition.
-- ============================================================================

BEGIN;

UPDATE public.notification_templates
SET trigger_condition = 'has_handprint',
    updated_at = now()
WHERE code = 'shooting_pickup_reminder';

UPDATE public.notification_templates
SET is_active = false,
    updated_at = now()
WHERE code IN (
  'shooting_pickup_reminder_digital',
  'shooting_completed_confirmed_to_photographer'
);

COMMIT;
