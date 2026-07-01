-- Migration 093: Corrected re-backfill of photographer_approved_material_urls
--
-- Supersedes migration 092 for the legacy affected collections. Migration 092
-- rebuilt the approved list as the union of (lab material + photographer links),
-- but the correct product rule is:
--   - if the photographer uploaded links (photographer_last_check_url non-empty),
--     client_confirmation shows ONLY those photographer links (the lab link is
--     hidden);
--   - otherwise it shows the lab material (validated by the photographer).
--
-- Scoped explicitly to the 40 legacy collections touched by migration 092 so we
-- never overwrite collections whose approved list was set by the current app
-- logic (point 1), where "Share high-res" + a later additional link legitimately
-- keeps both.
--
-- Idempotent: re-running yields the same result for these rows.

UPDATE public.collections c
SET photographer_approved_material_urls = CASE
  WHEN jsonb_array_length(COALESCE(c.photographer_last_check_url, '[]'::jsonb)) > 0
    THEN c.photographer_last_check_url
  WHEN c.photographer_request_edition
    THEN COALESCE(c.finals_selection_url, '[]'::jsonb)
  ELSE COALESCE(c.highres_selection_url, '[]'::jsonb)
END
WHERE c.id IN (
  '4b26bce6-dbbf-4e3a-a591-d90fa7838abe','eb2db03c-0632-44d1-9776-89ea7810b80c',
  'cde9caf3-f29b-428b-bced-9db8df40a9c7','2cb7eaa0-0692-4972-b222-38fdda8350a9',
  '4a0b46ff-c665-46c2-a4ad-cd6638ab891b','f88304d0-4f0d-4916-bcac-f8f0cc0f7029',
  '69b601e9-94a9-4be4-9ae1-0f8c55b26fd0','12e97811-fef7-44a0-bae0-26861b410c1e',
  '48fe6ff4-765c-4d94-bb69-914a7f5fde6a','7007ce42-397c-4708-b76c-eaf21790407d',
  'cf3f3e29-0fa4-4055-8404-7f70a8d573ea','adc7fa82-62e3-4b0a-af0c-56ff649199a3',
  '4b1ee788-bd20-443b-8192-3da3868331ef','2ec6985c-f572-45ca-b52f-06a31ccb84e8',
  '3a1ee3df-73f7-45cc-9322-2cbd52ef1432','be661645-1ab2-4602-a6f5-6ac086aee235',
  'c49e7ace-48a9-4099-a9a0-2cb4ac736489','4015336e-15f4-46a6-9fb4-e0d66fa97b8c',
  '8851ec11-2ffd-4ba5-8694-959fe846b85f','427e56ad-1e50-4492-bcb8-aa6a7af5306b',
  'be14a413-a037-4a49-8ab6-55e1550e3f8a','626d8d29-455d-435a-b367-792c995c4b6b',
  'e951dec8-8c8c-4188-964d-0f438dbfbea7','cf6141c3-bec1-416d-891f-8f3d1d516ac6',
  '12f1426f-8495-40b2-9d61-10db4fe7acae','250d4d3c-1229-4fdb-8dd0-cc2a0c79eb99',
  'c25c7ec6-0570-4aeb-9c81-5db448ef9d68','c00c5190-14f7-4e91-b8ba-81eb0bbff34e',
  'cceb6693-ebda-4e3e-afd4-026164ba3ae5','42aba8d7-6082-41c9-91c8-183dad6c0a75',
  '7af97a23-32c4-486b-83d8-88447cfdfd8b','d039338b-2590-4462-811e-4c9618cc016d',
  '0bd52d53-6fa5-403b-97ed-b226e939568c','8330272f-3e49-4dc1-96ad-b8e8565c3d5d',
  '115e8040-e750-4eb7-8cb0-939a200e402b','e8524538-cd95-4e9a-acf4-ba18a4c70992',
  '2fc8b81c-8f80-44ba-bf67-31f5cd841ce4','ab7ed0d3-5eeb-469b-8239-37dc6b774566',
  'ec411d41-d3e8-4c51-9923-ba144fc1f132','902c64df-2446-4e46-8ef1-189d647ff382'
);
