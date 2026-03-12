-- Notification duplicate diagnostics
-- Usage:
--   psql "$DATABASE_URL" -f scripts/notification-duplicates-audit.sql
-- Optional:
--   Replace interval window (default 30 days) as needed.

-- 1) Event duplicates by collection + event type
SELECT
  collection_id,
  event_type,
  COUNT(*) AS total_events,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen
FROM public.collection_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY collection_id, event_type
HAVING COUNT(*) > 1
ORDER BY total_events DESC, last_seen DESC
LIMIT 200;

-- 2) Notification duplicates by logical recipient target
SELECT
  collection_id,
  COALESCE(template_id::text, 'manual') AS template_ref,
  user_id,
  channel,
  COUNT(*) AS total_notifications,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen
FROM public.notifications
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY collection_id, COALESCE(template_id::text, 'manual'), user_id, channel
HAVING COUNT(*) > 1
ORDER BY total_notifications DESC, last_seen DESC
LIMIT 200;

-- 3) Duplicate burst detector (same target within 3 minutes)
WITH burst AS (
  SELECT
    n1.collection_id,
    COALESCE(n1.template_id::text, 'manual') AS template_ref,
    n1.user_id,
    n1.channel,
    n1.created_at AS created_at_a,
    n2.created_at AS created_at_b
  FROM public.notifications n1
  JOIN public.notifications n2
    ON n1.id < n2.id
   AND n1.collection_id = n2.collection_id
   AND COALESCE(n1.template_id::text, 'manual') = COALESCE(n2.template_id::text, 'manual')
   AND n1.user_id = n2.user_id
   AND n1.channel = n2.channel
   AND ABS(EXTRACT(EPOCH FROM (n2.created_at - n1.created_at))) <= 180
  WHERE n1.created_at >= NOW() - INTERVAL '30 days'
)
SELECT
  collection_id,
  template_ref,
  user_id,
  channel,
  COUNT(*) AS burst_pairs,
  MIN(created_at_a) AS first_pair_at,
  MAX(created_at_b) AS last_pair_at
FROM burst
GROUP BY collection_id, template_ref, user_id, channel
ORDER BY burst_pairs DESC, last_pair_at DESC
LIMIT 200;

-- 4) Cron overlap signal from scheduled tracking
SELECT
  DATE_TRUNC('minute', processing_started_at) AS minute_bucket,
  COUNT(*) AS rows_claimed
FROM public.scheduled_notification_tracking
WHERE processing_started_at IS NOT NULL
  AND processing_started_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('minute', processing_started_at)
HAVING COUNT(*) > 100
ORDER BY minute_bucket DESC
LIMIT 200;
