-- ============================================================================
-- Migration 088: Fix check_email_precheck after organizations -> players rename
-- ============================================================================
-- Migration 086 renamed profiles.organization_id to player_id but left
-- check_email_precheck() referencing organization_id, causing RPC failures
-- (empty error object in the client) for every non-internal user.
--
-- Also allow profiles that participate in collections via collection_members
-- but have no player_id on the profile row (collection-scoped invitations).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_email_precheck(check_email TEXT)
RETURNS TABLE(allowed BOOLEAN, reason TEXT) AS $$
DECLARE
  profile_record RECORD;
  invitation_record RECORD;
  normalized_email TEXT;
  has_collection_membership BOOLEAN;
BEGIN
  normalized_email := lower(trim(check_email));

  SELECT * INTO profile_record
  FROM public.profiles
  WHERE lower(email) = normalized_email;

  IF profile_record.id IS NOT NULL THEN
    IF profile_record.is_internal THEN
      RETURN QUERY SELECT true, 'internal'::TEXT;
      RETURN;
    END IF;

    IF profile_record.player_id IS NOT NULL THEN
      -- Return value kept for RPC contract compatibility (migration 086).
      RETURN QUERY SELECT true, 'organization_member'::TEXT;
      RETURN;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.collection_members cm
      WHERE cm.user_id = profile_record.id
    ) INTO has_collection_membership;

    IF has_collection_membership THEN
      RETURN QUERY SELECT true, 'collection_member'::TEXT;
      RETURN;
    END IF;
  END IF;

  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE lower(email) = normalized_email
    AND status = 'pending'
    AND expires_at > now();

  IF invitation_record.id IS NOT NULL THEN
    RETURN QUERY SELECT true, 'invited'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, 'not_invited'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_email_precheck(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.check_email_precheck IS
  'Check if email is allowed to request OTP (internal, player member, collection member, or pending invite)';
