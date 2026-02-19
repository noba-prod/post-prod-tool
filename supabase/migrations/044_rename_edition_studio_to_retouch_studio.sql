-- ============================================================================
-- Migration 044: Rename edition_studio organization type
-- Description: Renames organization_type enum value 'edition_studio' to
--              'retouch_studio' for organizations.type
-- ============================================================================

DO $$
BEGIN
  -- Rename only when the legacy value exists and the new one does not.
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'organization_type'
      AND e.enumlabel = 'edition_studio'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'organization_type'
      AND e.enumlabel = 'retouch_studio'
  ) THEN
    ALTER TYPE public.organization_type
      RENAME VALUE 'edition_studio' TO 'retouch_studio';
  END IF;
END $$;

COMMENT ON TYPE public.organization_type IS
  'Organization types: noba (production agency), client, photography_agency, self_photographer, lab_low_res_scan, retouch_studio, hand_print_lab';
