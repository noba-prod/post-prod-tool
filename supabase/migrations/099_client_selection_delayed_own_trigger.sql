-- ============================================================================
-- Migration 099: Independize client_selection_delayed from photographer selection
-- Description: Point client_selection_delayed at client_selection_deadline_missed
-- so it only fires when Client Selection's own deadline is missed and
-- photographer_selection_uploaded has already occurred (existing detector guard).
-- Does not alter photographer_selection_delayed or any other templates.
-- ============================================================================

UPDATE public.notification_templates
SET trigger_event = 'client_selection_deadline_missed',
    updated_at = now()
WHERE code = 'client_selection_delayed'
  AND trigger_event = 'photographer_selection_deadline_missed';
