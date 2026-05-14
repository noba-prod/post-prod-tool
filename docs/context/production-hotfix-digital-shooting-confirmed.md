# Production Hotfix: Digital Shooting Confirmation

## Goal

Fix the production bug where clicking **Confirm shooting ended** shows success but does not move the collection forward.

## Ordered execution plan

### Phase 1: Database first (safe, additive)

1. Add missing enum value `shooting_completed_confirmed` to `collection_event_type`.
2. Ensure digital templates exist:
   - `shooting_pickup_reminder_digital`
   - `shooting_completed_confirmed_to_photographer`
3. Ensure analog reminder keeps `trigger_condition = 'has_handprint'`.

Source SQL:
- `supabase/migrations/074_hotfix_digital_shooting_confirmed_prod.sql`

Validation queries:

```sql
select 'shooting_completed_confirmed'::collection_event_type as ok;

select code, trigger_event, trigger_condition, is_active
from public.notification_templates
where code in ('shooting_pickup_reminder_digital', 'shooting_completed_confirmed_to_photographer');
```

### Phase 2: Backend hardening

Update `NotificationsService.triggerEvent` to fail fast if `collection_events` cannot be persisted (except idempotency conflicts `23505`).

Why:
- Prevents false-positive UI success when event insert fails.
- Ensures workflow state and user feedback stay consistent.

Code change:
- `lib/services/notifications/notifications.service.ts`

### Phase 3: Data repair for affected records

Repair known impacted collection(s) that attempted digital shooting confirmation before the enum existed.

For collection `58705d2c-72ff-42ce-be89-b0fd9f183fd0`, run idempotent backfill:

```sql
insert into public.collection_events (
  collection_id,
  triggered_by_user_id,
  event_type,
  metadata,
  notifications_processed,
  processed_at,
  idempotency_key,
  metadata_hash
)
select
  '58705d2c-72ff-42ce-be89-b0fd9f183fd0'::uuid,
  null,
  'shooting_completed_confirmed'::collection_event_type,
  jsonb_build_object('source','prod_hotfix_backfill','reason','event_missing_before_enum_hotfix','performed_at', now()),
  true,
  now(),
  'hotfix-074-backfill-58705d2c-72ff-42ce-be89-b0fd9f183fd0',
  md5(coalesce((jsonb_build_object('source','prod_hotfix_backfill','reason','event_missing_before_enum_hotfix','performed_at', now()))::text,''))
where not exists (
  select 1 from public.collection_events
  where collection_id = '58705d2c-72ff-42ce-be89-b0fd9f183fd0'::uuid
    and event_type = 'shooting_completed_confirmed'::collection_event_type
);
```

Optional detector for other stuck digital collections:

```sql
select c.id, c.reference, c.substatus, c.shooting_end_date, c.shooting_end_time
from public.collections c
where c.status = 'in_progress'
  and c.low_res_to_high_res_digital = true
  and coalesce(c.low_res_to_high_res_hand_print,false) = false
  and c.substatus = 'shooting'
  and c.shooting_end_date is not null
  and c.shooting_end_date <= current_date
  and not exists (
    select 1
    from public.collection_events e
    where e.collection_id = c.id
      and e.event_type in ('shooting_completed_confirmed','shooting_ended','negatives_pickup_marked')
  );
```

## Reversible rollback strategy

Enum addition is intentionally left in place (non-destructive, low risk).

To rollback behavior safely:
1. Disable new digital templates.
2. Restore analog reminder condition.

Rollback SQL:
- `supabase/migrations/074_hotfix_digital_shooting_confirmed_prod.rollback.sql`

## Release checklist

1. Apply DB migration in production.
2. Deploy backend with fail-fast persistence behavior.
3. Run targeted backfill(s).
4. Validate end-to-end on one digital collection:
   - click **Confirm shooting ended**
   - verify `collection_events` row is created
   - verify collection moves to next step.
