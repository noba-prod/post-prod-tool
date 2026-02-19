-- ============================================================================
-- Migration 042: RLS - Collection members can view their collections
-- Description:
--   Users who are in collection_members must be able to view the collection,
--   e.g. when they are added as photographer/agency/client and photographer_id
--   or other org fields don't match (e.g. self-photographer in agency setup).
-- ============================================================================

CREATE POLICY "Collection members can view their collections"
  ON public.collections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collection_members cm
      WHERE cm.collection_id = id
        AND cm.user_id = auth.uid()
    )
  );
