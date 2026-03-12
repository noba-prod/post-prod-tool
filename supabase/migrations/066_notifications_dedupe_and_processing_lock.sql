-- ============================================================================
-- Migration 066: Notifications dedupe and processing locks
-- Description:
--   1) Adds processing state support for notifications
--   2) Adds idempotency key support for collection_events
--   3) Adds claim/lock fields for scheduled_notification_tracking
--   4) Adds unique indexes to prevent duplicate logical sends
-- ============================================================================

-- 1) notification_status enum -> add processing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_status'
      AND e.enumlabel = 'processing'
  ) THEN
    ALTER TYPE public.notification_status ADD VALUE 'processing';
  END IF;
END$$;

-- 2) notifications: dedupe + processing claim metadata
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_by TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_dedupe_key
  ON public.notifications(dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_pending_due
  ON public.notifications(scheduled_for, created_at)
  WHERE status IN ('pending', 'processing');

-- 3) collection_events: idempotency support
ALTER TABLE public.collection_events
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS metadata_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_collection_events_idempotency_key
  ON public.collection_events(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Keep these event types strictly one-time per collection.
CREATE UNIQUE INDEX IF NOT EXISTS uq_collection_events_singleton_types
  ON public.collection_events(collection_id, event_type)
  WHERE event_type IN (
    'shooting_started',
    'dropoff_deadline_missed',
    'scanning_deadline_missed',
    'photographer_selection_deadline_missed',
    'client_selection_deadline_missed',
    'photographer_check_deadline_missed',
    'highres_deadline_missed',
    'edition_request_deadline_missed',
    'final_edits_deadline_missed',
    'photographer_review_deadline_missed'
  );

-- 4) scheduled_notification_tracking: claim/lock fields
ALTER TABLE public.scheduled_notification_tracking
  ADD COLUMN IF NOT EXISTS is_processing BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_by TEXT;

CREATE INDEX IF NOT EXISTS idx_scheduled_tracking_due_claim
  ON public.scheduled_notification_tracking(scheduled_for, created_at)
  WHERE is_sent = false;

