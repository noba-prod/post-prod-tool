-- ============================================================================
-- Migration 009: Add collection-scoped invitation support
-- Description: invitations can reference a collection and the role to assign on accept
-- ============================================================================

-- Add collection_id and invited_collection_role for "invite to collection" flow (both nullable for org-only invites)
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS collection_id UUID NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS invited_collection_role public.collection_member_role NULL;

-- Index for looking up invitations by collection
CREATE INDEX IF NOT EXISTS idx_invitations_collection ON public.invitations(collection_id);

-- RLS: allow viewing/creating invitations for collections the user's org owns
-- (Existing org policies remain; collection_id is optional for org-only invites.)
COMMENT ON COLUMN public.invitations.collection_id IS 'When set, invitation is for this collection; on accept user is added to collection_members with invited_collection_role';
COMMENT ON COLUMN public.invitations.invited_collection_role IS 'Role to assign in collection_members when invitation is accepted (when collection_id is set)';
