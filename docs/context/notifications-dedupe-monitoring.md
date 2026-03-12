# Notifications Dedupe Monitoring

## Goal

Reduce duplicate notifications to near zero across email and in-app channels.

## KPI

- Duplicate logical notifications: `< 1 / 1000` workflow events.
- Duplicate email sends for the same logical key: `0`.

## How to measure

Run:

- `scripts/notification-duplicates-audit.sql`

Primary checks:

- Repeated `collection_events` for singleton events (`*_deadline_missed`, `shooting_started`).
- Repeated `notifications` for same `(collection, template/manual, user, channel)`.
- Burst duplicates inside 3 minutes for same target.

## New safeguards (code-level)

- Event idempotency key accepted in `/api/collections/[id]/events`.
- Unique DB guards for:
  - `collection_events.idempotency_key`
  - singleton event types by `(collection_id, event_type)`
  - `notifications.dedupe_key`
- Cron claim protocol:
  - `scheduled_notification_tracking.is_processing`
  - `notifications.status = processing`

## Operational checklist

1. Ensure only one external cron job points to `/api/cron/notifications`.
2. Verify no stale `processing` rows older than 15 minutes.
3. Monitor `failed` notifications and retry rates after release.
