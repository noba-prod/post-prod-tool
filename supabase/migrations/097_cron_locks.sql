-- ============================================================================
-- Migration 097: Cron run locks
-- Prevents overlapping /api/cron/notifications executions when the external
-- scheduler retries or fires every minute while a previous run is still active.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cron_locks (
  lock_key text PRIMARY KEY,
  locked_by text,
  locked_at timestamptz,
  expires_at timestamptz
);

ALTER TABLE public.cron_locks ENABLE ROW LEVEL SECURITY;

INSERT INTO public.cron_locks (lock_key, locked_by, locked_at, expires_at)
VALUES ('notifications_cron', NULL, NULL, NULL)
ON CONFLICT (lock_key) DO NOTHING;
