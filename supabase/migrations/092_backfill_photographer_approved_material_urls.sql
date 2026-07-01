-- Migration 092: Backfill photographer_approved_material_urls for legacy collections
--
-- Context: collections whose "photographer_last_check" step was completed before
-- the approval-tracking field (photographer_approved_material_urls) existed ended
-- up with an empty approved list. As a result, client_confirmation shows nothing
-- even though the step is done and the DB holds the material links.
--
-- All affected collections completed the step via "Share high-res with client"
-- (the photographer_edits_approved event carries no url), so the lab material is
-- the primary approved link and every photographer_last_check_url is an additional
-- link. The approved list is rebuilt as: lab material first, then additional links,
-- deduplicated and order-preserving.
--
-- Idempotent: only touches rows where the approved list is still empty.

WITH affected AS (
  SELECT
    c.id,
    CASE WHEN c.photographer_request_edition
         THEN COALESCE(c.finals_selection_url, '[]'::jsonb)
         ELSE COALESCE(c.highres_selection_url, '[]'::jsonb)
    END AS material,
    COALESCE(c.photographer_last_check_url, '[]'::jsonb) AS lastcheck
  FROM public.collections c
  WHERE c.step_statuses->'photographer_last_check'->>'stage' = 'done'
    AND COALESCE(c.photographer_approved_material_urls, '[]'::jsonb) = '[]'::jsonb
    AND (
      jsonb_array_length(COALESCE(c.highres_selection_url, '[]'::jsonb)) > 0
      OR jsonb_array_length(COALESCE(c.finals_selection_url, '[]'::jsonb)) > 0
      OR jsonb_array_length(COALESCE(c.photographer_last_check_url, '[]'::jsonb)) > 0
    )
),
ordered_urls AS (
  SELECT a.id, u.url, MIN(u.ord) AS ord
  FROM affected a
  CROSS JOIN LATERAL (
    SELECT elem AS url, ord::bigint AS ord
      FROM jsonb_array_elements_text(a.material) WITH ORDINALITY AS m(elem, ord)
    UNION ALL
    SELECT elem, (ord + 1000000)::bigint
      FROM jsonb_array_elements_text(a.lastcheck) WITH ORDINALITY AS l(elem, ord)
  ) u
  WHERE u.url IS NOT NULL AND btrim(u.url) <> ''
  GROUP BY a.id, u.url
),
approved AS (
  SELECT id, jsonb_agg(url ORDER BY ord) AS urls
  FROM ordered_urls
  GROUP BY id
)
UPDATE public.collections c
SET photographer_approved_material_urls = approved.urls
FROM approved
WHERE c.id = approved.id
  AND approved.urls IS NOT NULL
  AND jsonb_array_length(approved.urls) > 0;
