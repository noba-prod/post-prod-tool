-- Rollback for 099: restore pre-fix shared trigger (NOT recommended long-term).
UPDATE public.notification_templates
SET trigger_event = 'photographer_selection_deadline_missed',
    updated_at = now()
WHERE code = 'client_selection_delayed'
  AND trigger_event = 'client_selection_deadline_missed';
