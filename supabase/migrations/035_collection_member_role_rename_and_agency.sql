-- ============================================================================
-- Migration 035: Normalize collection_member_role values + add agency role
-- Description:
--   - Replaces legacy enum values with the new canonical set:
--       client, noba, photographer, agency, photo_lab, retouch_studio, handprint_lab
--   - Migrates existing rows in:
--       public.collection_members.role
--       public.invitations.invited_collection_role
-- ============================================================================

BEGIN;

-- Temporarily cast role columns to text so the old enum type can be replaced.
ALTER TABLE public.collection_members
  ALTER COLUMN role TYPE text
  USING role::text;

ALTER TABLE public.invitations
  ALTER COLUMN invited_collection_role TYPE text
  USING invited_collection_role::text;

DROP TYPE IF EXISTS public.collection_member_role;

CREATE TYPE public.collection_member_role AS ENUM (
  'client',
  'noba',
  'photographer',
  'agency',
  'photo_lab',
  'retouch_studio',
  'handprint_lab'
);

-- Remap all known legacy values to the new enum.
ALTER TABLE public.collection_members
  ALTER COLUMN role TYPE public.collection_member_role
  USING (
    CASE role
      WHEN 'manager' THEN 'client'
      WHEN 'client' THEN 'client'
      WHEN 'producer' THEN 'noba'
      WHEN 'noba' THEN 'noba'
      WHEN 'photographer' THEN 'photographer'
      WHEN 'agency' THEN 'agency'
      WHEN 'lab_technician' THEN 'photo_lab'
      WHEN 'lab' THEN 'photo_lab'
      WHEN 'photo_lab' THEN 'photo_lab'
      WHEN 'editor' THEN 'retouch_studio'
      WHEN 'edition_studio' THEN 'retouch_studio'
      WHEN 'retouch_studio' THEN 'retouch_studio'
      WHEN 'print_technician' THEN 'handprint_lab'
      WHEN 'handprint_lab' THEN 'handprint_lab'
      ELSE 'client'
    END
  )::public.collection_member_role;

-- Backfill agency members:
-- legacy data stored agency users as photographer; if the user's organization matches
-- the selected photography_agency (collections.photographer_id) in agency mode,
-- reclassify that member as agency.
UPDATE public.collection_members cm
SET role = 'agency'
FROM public.collections c, public.profiles p
WHERE cm.collection_id = c.id
  AND p.id = cm.user_id
  AND cm.role = 'photographer'
  AND c.photographer_collaborates_with_agency = true
  AND c.photographer_id IS NOT NULL
  AND p.organization_id = c.photographer_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.collection_members cm2
    WHERE cm2.collection_id = cm.collection_id
      AND cm2.user_id = cm.user_id
      AND cm2.role = 'agency'
  );

ALTER TABLE public.invitations
  ALTER COLUMN invited_collection_role TYPE public.collection_member_role
  USING (
    CASE
      WHEN invited_collection_role IS NULL THEN NULL
      WHEN invited_collection_role = 'manager' THEN 'client'
      WHEN invited_collection_role = 'client' THEN 'client'
      WHEN invited_collection_role = 'producer' THEN 'noba'
      WHEN invited_collection_role = 'noba' THEN 'noba'
      WHEN invited_collection_role = 'photographer' THEN 'photographer'
      WHEN invited_collection_role = 'agency' THEN 'agency'
      WHEN invited_collection_role = 'lab_technician' THEN 'photo_lab'
      WHEN invited_collection_role = 'lab' THEN 'photo_lab'
      WHEN invited_collection_role = 'photo_lab' THEN 'photo_lab'
      WHEN invited_collection_role = 'editor' THEN 'retouch_studio'
      WHEN invited_collection_role = 'edition_studio' THEN 'retouch_studio'
      WHEN invited_collection_role = 'retouch_studio' THEN 'retouch_studio'
      WHEN invited_collection_role = 'print_technician' THEN 'handprint_lab'
      WHEN invited_collection_role = 'handprint_lab' THEN 'handprint_lab'
      ELSE 'client'
    END
  )::public.collection_member_role;

COMMENT ON TYPE public.collection_member_role IS
  'Roles for collection participants: client, noba, photographer, agency, photo_lab, retouch_studio, handprint_lab';

COMMIT;
