-- ============================================================================
-- Migration 058: Rename collections columns and organization_type enum
-- Description: Align DB naming with domain (photo_lab, retouch_studio, handprint_lab)
--
-- Columns:
--   lab_low_res_id → photo_lab_id
--   edition_studio_id → retouch_studio_id
--   hand_print_lab_id → handprint_lab_id
--
-- organization_type enum:
--   lab_low_res_scan → photo_lab
--   hand_print_lab → handprint_lab
--   retouch_studio (already correct from migration 044)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Rename organization_type enum values
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Rename lab_low_res_scan → photo_lab
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'organization_type'
      AND e.enumlabel = 'lab_low_res_scan'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'organization_type'
      AND e.enumlabel = 'photo_lab'
  ) THEN
    ALTER TYPE public.organization_type RENAME VALUE 'lab_low_res_scan' TO 'photo_lab';
  END IF;
END $$;

DO $$
BEGIN
  -- Rename hand_print_lab → handprint_lab
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'organization_type'
      AND e.enumlabel = 'hand_print_lab'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'organization_type'
      AND e.enumlabel = 'handprint_lab'
  ) THEN
    ALTER TYPE public.organization_type RENAME VALUE 'hand_print_lab' TO 'handprint_lab';
  END IF;
END $$;

COMMENT ON TYPE public.organization_type IS
  'Organization types: noba (production agency), client, photography_agency, self_photographer, photo_lab, retouch_studio, handprint_lab';

-- ----------------------------------------------------------------------------
-- 2. Rename collections table columns
-- ----------------------------------------------------------------------------

ALTER TABLE public.collections RENAME COLUMN lab_low_res_id TO photo_lab_id;
ALTER TABLE public.collections RENAME COLUMN edition_studio_id TO retouch_studio_id;
ALTER TABLE public.collections RENAME COLUMN hand_print_lab_id TO handprint_lab_id;

-- ----------------------------------------------------------------------------
-- 3. Rename indexes (PostgreSQL renames them automatically with the column,
--    but the index names stay. Rename for consistency.)
-- ----------------------------------------------------------------------------

ALTER INDEX IF EXISTS idx_collections_lab_low_res RENAME TO idx_collections_photo_lab;
ALTER INDEX IF EXISTS idx_collections_edition_studio RENAME TO idx_collections_retouch_studio;
ALTER INDEX IF EXISTS idx_collections_hand_print_lab RENAME TO idx_collections_handprint_lab;

-- ----------------------------------------------------------------------------
-- 4. Update column comments
-- ----------------------------------------------------------------------------

COMMENT ON COLUMN public.collections.photo_lab_id IS 'Assigned photo lab (low-res scan)';
COMMENT ON COLUMN public.collections.retouch_studio_id IS 'Assigned retouch/edition studio';
COMMENT ON COLUMN public.collections.handprint_lab_id IS 'Assigned hand print lab';
