-- ============================================================================
-- Migration 006: Expand Collection Member Roles
-- Description: Adds new roles to collection_member_role enum for all workflow participants
-- ============================================================================
-- 
-- Run this ONLY if you already deployed migrations 1-5.
-- If starting fresh, this is already included in 003_collections.sql
--
-- ============================================================================

-- Add new enum values to collection_member_role
-- PostgreSQL requires adding enum values one at a time
ALTER TYPE collection_member_role ADD VALUE IF NOT EXISTS 'lab_technician';
ALTER TYPE collection_member_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE collection_member_role ADD VALUE IF NOT EXISTS 'print_technician';

-- Update the RLS policy to include all organization types
DROP POLICY IF EXISTS "Users can view collection members" ON public.collection_members;

CREATE POLICY "Users can view collection members"
  ON public.collection_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id
      AND (
        c.client_id = public.get_user_organization_id()
        OR c.photographer_id = public.get_user_organization_id()
        OR c.lab_low_res_id = public.get_user_organization_id()
        OR c.edition_studio_id = public.get_user_organization_id()
        OR c.hand_print_lab_id = public.get_user_organization_id()
      )
    )
  );

-- Add comments for documentation
COMMENT ON TYPE collection_member_role IS 'Roles for collection workflow participants: manager (client), photographer, lab_technician (low-res lab), editor (edition studio), print_technician (hand print lab)';

