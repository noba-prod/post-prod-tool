-- ============================================================================
-- Migration 057: Rename notification_recipient_type for project consistency
-- Description: Align recipient type names with collection_member_role:
--   lab → photo_lab
--   hand_print_lab → handprint_lab
--   edition_studio → retouch_studio
-- ============================================================================

DO $$
BEGIN
  -- Rename lab → photo_lab
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'notification_recipient_type'
      AND e.enumlabel = 'lab'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'notification_recipient_type'
      AND e.enumlabel = 'photo_lab'
  ) THEN
    ALTER TYPE public.notification_recipient_type RENAME VALUE 'lab' TO 'photo_lab';
  END IF;
END $$;

DO $$
BEGIN
  -- Rename hand_print_lab → handprint_lab
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'notification_recipient_type'
      AND e.enumlabel = 'hand_print_lab'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'notification_recipient_type'
      AND e.enumlabel = 'handprint_lab'
  ) THEN
    ALTER TYPE public.notification_recipient_type RENAME VALUE 'hand_print_lab' TO 'handprint_lab';
  END IF;
END $$;

DO $$
BEGIN
  -- Rename edition_studio → retouch_studio
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'notification_recipient_type'
      AND e.enumlabel = 'edition_studio'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'notification_recipient_type'
      AND e.enumlabel = 'retouch_studio'
  ) THEN
    ALTER TYPE public.notification_recipient_type RENAME VALUE 'edition_studio' TO 'retouch_studio';
  END IF;
END $$;
