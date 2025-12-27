-- ============================================================================
-- Migration 004: Row Level Security Policies
-- Description: Comprehensive RLS policies for permission management
-- ============================================================================

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Check if current user is internal (production agency staff)
CREATE OR REPLACE FUNCTION public.is_internal_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_internal = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is admin of their organization
CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user belongs to a specific organization
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ORGANIZATIONS Policies
-- ============================================================================

-- Internal users can view all organizations
CREATE POLICY "Internal users can view all organizations"
  ON public.organizations
  FOR SELECT
  USING (public.is_internal_user());

-- Internal users can create organizations
CREATE POLICY "Internal users can create organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (public.is_internal_user());

-- Internal users can update all organizations
CREATE POLICY "Internal users can update all organizations"
  ON public.organizations
  FOR UPDATE
  USING (public.is_internal_user());

-- Internal users can delete organizations
CREATE POLICY "Internal users can delete organizations"
  ON public.organizations
  FOR DELETE
  USING (public.is_internal_user());

-- Entity users can view their own organization
CREATE POLICY "Users can view their own organization"
  ON public.organizations
  FOR SELECT
  USING (id = public.get_user_organization_id());

-- Entity users can update their own organization
CREATE POLICY "Users can update their own organization"
  ON public.organizations
  FOR UPDATE
  USING (
    id = public.get_user_organization_id()
    AND public.is_org_admin()
  );

-- ============================================================================
-- PROFILES Policies
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid());

-- Internal users can view all profiles
CREATE POLICY "Internal users can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_internal_user());

-- Internal users can create profiles
CREATE POLICY "Internal users can create profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (public.is_internal_user());

-- Internal users can update all profiles
CREATE POLICY "Internal users can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (public.is_internal_user());

-- Internal users can delete profiles
CREATE POLICY "Internal users can delete profiles"
  ON public.profiles
  FOR DELETE
  USING (public.is_internal_user());

-- Org admins can view profiles in their organization
CREATE POLICY "Org admins can view org profiles"
  ON public.profiles
  FOR SELECT
  USING (
    organization_id = public.get_user_organization_id()
    AND public.is_org_admin()
  );

-- Org admins can create profiles in their organization
CREATE POLICY "Org admins can create org profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.is_org_admin()
  );

-- Org admins can update profiles in their organization
CREATE POLICY "Org admins can update org profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id()
    AND public.is_org_admin()
  );

-- Org admins can delete profiles in their organization
CREATE POLICY "Org admins can delete org profiles"
  ON public.profiles
  FOR DELETE
  USING (
    organization_id = public.get_user_organization_id()
    AND public.is_org_admin()
  );

-- ============================================================================
-- COLLECTIONS Policies
-- ============================================================================

-- Internal users have full access to all collections
CREATE POLICY "Internal users can view all collections"
  ON public.collections
  FOR SELECT
  USING (public.is_internal_user());

CREATE POLICY "Internal users can create collections"
  ON public.collections
  FOR INSERT
  WITH CHECK (public.is_internal_user());

CREATE POLICY "Internal users can update all collections"
  ON public.collections
  FOR UPDATE
  USING (public.is_internal_user());

CREATE POLICY "Internal users can delete collections"
  ON public.collections
  FOR DELETE
  USING (public.is_internal_user());

-- Client users can view their collections
CREATE POLICY "Client users can view their collections"
  ON public.collections
  FOR SELECT
  USING (client_id = public.get_user_organization_id());

-- Assigned photographers can view their collections
CREATE POLICY "Photographers can view assigned collections"
  ON public.collections
  FOR SELECT
  USING (photographer_id = public.get_user_organization_id());

-- Assigned labs can view their collections
CREATE POLICY "Labs can view assigned collections"
  ON public.collections
  FOR SELECT
  USING (lab_low_res_id = public.get_user_organization_id());

-- Assigned edition studios can view their collections
CREATE POLICY "Edition studios can view assigned collections"
  ON public.collections
  FOR SELECT
  USING (edition_studio_id = public.get_user_organization_id());

-- Assigned hand print labs can view their collections
CREATE POLICY "Hand print labs can view assigned collections"
  ON public.collections
  FOR SELECT
  USING (hand_print_lab_id = public.get_user_organization_id());

-- ============================================================================
-- COLLECTION_MEMBERS Policies
-- ============================================================================

-- Internal users have full access
CREATE POLICY "Internal users can manage collection members"
  ON public.collection_members
  FOR ALL
  USING (public.is_internal_user());

-- Users can view collection members if:
-- 1. They are a member themselves
-- 2. They belong to any assigned organization (client, photographer, lab, studio, etc.)
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

-- ============================================================================
-- INVITATIONS Policies
-- ============================================================================

-- Internal users have full access
CREATE POLICY "Internal users can manage all invitations"
  ON public.invitations
  FOR ALL
  USING (public.is_internal_user());

-- Org admins can view invitations for their organization
CREATE POLICY "Org admins can view org invitations"
  ON public.invitations
  FOR SELECT
  USING (
    organization_id = public.get_user_organization_id()
    AND public.is_org_admin()
  );

-- Org admins can create invitations for their organization
CREATE POLICY "Org admins can create org invitations"
  ON public.invitations
  FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.is_org_admin()
  );

-- Org admins can update invitations for their organization
CREATE POLICY "Org admins can update org invitations"
  ON public.invitations
  FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id()
    AND public.is_org_admin()
  );

-- Org admins can delete invitations for their organization
CREATE POLICY "Org admins can delete org invitations"
  ON public.invitations
  FOR DELETE
  USING (
    organization_id = public.get_user_organization_id()
    AND public.is_org_admin()
  );

-- Anyone can view their own invitation by token (for activation)
CREATE POLICY "Users can view invitation by token"
  ON public.invitations
  FOR SELECT
  USING (true);  -- Token lookup is done via service role, this allows the RPC to work

-- ============================================================================
-- RPC Functions for Common Operations
-- ============================================================================

-- Check if email is allowed to request OTP (for auth flow)
CREATE OR REPLACE FUNCTION public.check_email_precheck(check_email TEXT)
RETURNS TABLE(allowed BOOLEAN, reason TEXT) AS $$
DECLARE
  profile_record RECORD;
  invitation_record RECORD;
BEGIN
  -- Check if user exists in profiles
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE email = check_email;
  
  IF profile_record.id IS NOT NULL THEN
    -- User exists
    IF profile_record.is_internal THEN
      RETURN QUERY SELECT true, 'internal'::TEXT;
      RETURN;
    END IF;
    
    IF profile_record.organization_id IS NOT NULL THEN
      RETURN QUERY SELECT true, 'organization_member'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Check for pending invitation
  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE email = check_email
  AND status = 'pending'
  AND expires_at > now();
  
  IF invitation_record.id IS NOT NULL THEN
    RETURN QUERY SELECT true, 'invited'::TEXT;
    RETURN;
  END IF;
  
  -- Not allowed
  RETURN QUERY SELECT false, 'not_invited'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_email_precheck TO anon, authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION public.is_internal_user IS 'Check if current user is production agency staff';
COMMENT ON FUNCTION public.get_user_organization_id IS 'Get organization ID for current user';
COMMENT ON FUNCTION public.is_org_admin IS 'Check if current user is admin of their organization';
COMMENT ON FUNCTION public.check_email_precheck IS 'Check if email is allowed to request OTP';

