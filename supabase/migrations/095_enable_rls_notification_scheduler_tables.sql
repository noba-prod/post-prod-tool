-- Migration 095: Enable RLS on notification scheduler tables
--
-- These two public tables were created in 016 with (or without) policies, but
-- RLS was never enabled. Without RLS, PostgREST exposes full CRUD to anon via
-- the published anon key. Cron and API routes use service_role, which bypasses
-- RLS, so scheduling/sending keep working.
--
-- Applied first on noba-prod-dev for verification before prod.

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_notification_tracking ENABLE ROW LEVEL SECURITY;

-- Catalog: authenticated users may read templates; writes stay server-side.
DROP POLICY IF EXISTS "notification_templates_read_all" ON public.notification_templates;
CREATE POLICY "notification_templates_read_all"
  ON public.notification_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Scheduler state: no client policies → denied by default for anon/authenticated.

REVOKE ALL ON TABLE public.notification_templates FROM anon;
REVOKE ALL ON TABLE public.scheduled_notification_tracking FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.notification_templates FROM authenticated;
GRANT SELECT ON TABLE public.notification_templates TO authenticated;

REVOKE ALL ON TABLE public.scheduled_notification_tracking FROM authenticated;
