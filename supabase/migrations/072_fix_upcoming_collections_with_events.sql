-- ============================================================================
-- Migration 072: Fix legacy collections stuck as "upcoming" with workflow progress
-- Description: Collections with status='upcoming' that have collection_events
--   (workflow progress) should be status='in_progress'. This fixes data that was
--   incorrectly overwritten when deriveCanonicalCollectionStatus only used
--   shooting dates and ignored substatus/completion_percentage.
-- ============================================================================

-- Event types that indicate workflow progress (advancing events)
-- Map: event_type -> substatus to set when this is the latest such event
WITH advancing_events AS (
  SELECT
    c.id AS collection_id,
    e.event_type,
    e.created_at,
    CASE e.event_type
      WHEN 'negatives_pickup_marked' THEN 'negatives_drop_off'
      WHEN 'shooting_ended' THEN 'negatives_drop_off'
      WHEN 'dropoff_confirmed' THEN 'low_res_scanning'
      WHEN 'scanning_completed' THEN 'photographer_selection'
      WHEN 'photographer_selection_uploaded' THEN 'client_selection'
      WHEN 'client_selection_confirmed' THEN 'low_res_to_high_res'
      WHEN 'photographer_check_approved' THEN 'low_res_to_high_res'
      WHEN 'highres_ready' THEN 'edition_request'
      WHEN 'edition_request_submitted' THEN 'final_edits'
      WHEN 'final_edits_completed' THEN 'photographer_last_check'
      WHEN 'photographer_edits_approved' THEN 'client_confirmation'
      WHEN 'retouch_studio_shared_additional_materials' THEN NULL  -- no advance
      WHEN 'photographer_last_check_shared_additional_materials' THEN NULL
      ELSE NULL
    END AS target_substatus
  FROM public.collections c
  JOIN public.collection_events e ON e.collection_id = c.id
  WHERE c.status = 'upcoming'
    AND c.published_at IS NOT NULL
    AND e.event_type IN (
      'negatives_pickup_marked', 'shooting_ended', 'dropoff_confirmed',
      'scanning_completed', 'photographer_selection_uploaded',
      'client_selection_confirmed', 'photographer_check_approved',
      'highres_ready', 'edition_request_submitted', 'final_edits_completed',
      'photographer_edits_approved'
    )
),
latest_per_collection AS (
  SELECT DISTINCT ON (collection_id)
    collection_id,
    target_substatus
  FROM advancing_events
  WHERE target_substatus IS NOT NULL
  ORDER BY collection_id, created_at DESC
)
UPDATE public.collections c
SET
  status = 'in_progress',
  substatus = COALESCE(l.target_substatus, 'shooting')
FROM latest_per_collection l
WHERE c.id = l.collection_id
  AND c.status = 'upcoming';
