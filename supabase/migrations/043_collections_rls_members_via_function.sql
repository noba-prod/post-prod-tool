-- ============================================================================
-- Migration 043: Fix RLS circular dependency (042)
-- Description:
--   Policy 042 on collections used EXISTS (SELECT FROM collection_members).
--   collection_members has a policy that uses EXISTS (SELECT FROM collections).
--   That caused a circular dependency and list collections to fail.
--   Fix: use a SECURITY DEFINER function so the check runs without RLS on
--   collection_members, breaking the cycle.
-- ============================================================================

-- Remove the policy that caused the cycle
DROP POLICY IF EXISTS "Collection members can view their collections" ON public.collections;

-- Function runs as definer (bypasses RLS on collection_members when used from collections policy)
CREATE OR REPLACE FUNCTION public.user_is_collection_member(p_collection_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collection_members cm
    WHERE cm.collection_id = p_collection_id
      AND cm.user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.user_is_collection_member(uuid) IS
  'Returns true if current user is in collection_members for the given collection. Used by RLS on collections to avoid circular policy dependency.';

-- Re-create the policy using the function (no direct read of collection_members from collections RLS)
CREATE POLICY "Collection members can view their collections"
  ON public.collections
  FOR SELECT
  USING (public.user_is_collection_member(id));
