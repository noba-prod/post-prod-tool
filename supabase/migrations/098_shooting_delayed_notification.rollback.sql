-- Rollback for 098: remove Shooting Delayed template.
-- Does not delete any notifications already generated.
DELETE FROM public.notification_templates
WHERE code = 'shooting_delayed';
