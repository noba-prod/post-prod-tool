-- ============================================================================
-- Migration 015: Add 'producer' to collection_member_role
-- Description: Noba* (producer) users are stored with role = 'producer';
--              client-side members remain role = 'manager'.
-- ============================================================================

ALTER TYPE collection_member_role ADD VALUE IF NOT EXISTS 'producer';

COMMENT ON TYPE collection_member_role IS 'Roles for collection participants: manager (client), producer (noba*), photographer, lab_technician, editor, print_technician';
