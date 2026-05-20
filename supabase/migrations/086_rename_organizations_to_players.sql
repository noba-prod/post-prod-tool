-- ============================================================================
-- Migration 086: Rename organizations -> players
-- Description: Customer-driven domain rename. After this migration, the table
--   public.organizations is named public.players, and the FK columns
--   profiles.organization_id and invitations.organization_id are named
--   profiles.player_id and invitations.player_id. The enum public.organization_type
--   is renamed to public.player_type (values unchanged). RLS helper functions
--   and dependent policies are rebuilt against the new names. Indexes, FK
--   constraints, and triggers are renamed for consistency.
--
-- Notes:
--   - Migrations 001..085 are left untouched. This is the canonical rename point.
--   - Only applied to the dev project (noba-prod-dev). Production (noba-prod-prod)
--     will need the same migration when promoted.
--   - Storage bucket names and object paths are not affected (paths are UUIDs).
--   - is_internal_user() and is_org_admin() are intentionally out of scope.
--   - check_email_precheck() return value 'organization_member' is preserved
--     intentionally to avoid changing the RPC contract.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Rename enum type organization_type -> player_type
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'organization_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'player_type'
  ) THEN
    ALTER TYPE public.organization_type RENAME TO player_type;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Rename table organizations -> players
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'organizations' AND c.relkind = 'r'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'players' AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.organizations RENAME TO players;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Rename FK columns on dependent tables
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'player_id'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN organization_id TO player_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invitations' AND column_name = 'organization_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invitations' AND column_name = 'player_id'
  ) THEN
    ALTER TABLE public.invitations RENAME COLUMN organization_id TO player_id;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Replace helper functions: get_user_organization_id -> get_user_player_id
--    and user_belongs_to_org -> user_belongs_to_player.
--
--    We CREATE the new functions first, then rebuild every policy that depends
--    on the old function name, and finally DROP the old functions.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_player_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT player_id FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_player(p_player_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND player_id = p_player_id
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Rebuild every RLS policy that referenced get_user_organization_id() or
--    user_belongs_to_org(). Column rename (organization_id -> player_id) is
--    automatically propagated by Postgres into existing policy parse trees,
--    so policies that ONLY reference the renamed column (and not the renamed
--    function) do not need to be touched.
--
--    Policies rebuilt below: 14 total.
-- ----------------------------------------------------------------------------

-- public.players (was public.organizations) -- 2 policies use get_user_organization_id
DROP POLICY IF EXISTS "Users can update their own organization" ON public.players;
CREATE POLICY "Users can update their own organization"
  ON public.players
  FOR UPDATE
  USING ((id = get_user_player_id()) AND is_org_admin());

DROP POLICY IF EXISTS "Users can view their own organization" ON public.players;
CREATE POLICY "Users can view their own organization"
  ON public.players
  FOR SELECT
  USING (id = get_user_player_id());

-- public.profiles -- 4 "Org admins" policies use get_user_organization_id
DROP POLICY IF EXISTS "Org admins can create org profiles" ON public.profiles;
CREATE POLICY "Org admins can create org profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK ((player_id = get_user_player_id()) AND is_org_admin());

DROP POLICY IF EXISTS "Org admins can delete org profiles" ON public.profiles;
CREATE POLICY "Org admins can delete org profiles"
  ON public.profiles
  FOR DELETE
  USING ((player_id = get_user_player_id()) AND is_org_admin());

DROP POLICY IF EXISTS "Org admins can update org profiles" ON public.profiles;
CREATE POLICY "Org admins can update org profiles"
  ON public.profiles
  FOR UPDATE
  USING ((player_id = get_user_player_id()) AND is_org_admin());

DROP POLICY IF EXISTS "Org admins can view org profiles" ON public.profiles;
CREATE POLICY "Org admins can view org profiles"
  ON public.profiles
  FOR SELECT
  USING ((player_id = get_user_player_id()) AND is_org_admin());

-- public.invitations -- 4 "Org admins" policies use get_user_organization_id
DROP POLICY IF EXISTS "Org admins can create org invitations" ON public.invitations;
CREATE POLICY "Org admins can create org invitations"
  ON public.invitations
  FOR INSERT
  WITH CHECK ((player_id = get_user_player_id()) AND is_org_admin());

DROP POLICY IF EXISTS "Org admins can delete org invitations" ON public.invitations;
CREATE POLICY "Org admins can delete org invitations"
  ON public.invitations
  FOR DELETE
  USING ((player_id = get_user_player_id()) AND is_org_admin());

DROP POLICY IF EXISTS "Org admins can update org invitations" ON public.invitations;
CREATE POLICY "Org admins can update org invitations"
  ON public.invitations
  FOR UPDATE
  USING ((player_id = get_user_player_id()) AND is_org_admin());

DROP POLICY IF EXISTS "Org admins can view org invitations" ON public.invitations;
CREATE POLICY "Org admins can view org invitations"
  ON public.invitations
  FOR SELECT
  USING ((player_id = get_user_player_id()) AND is_org_admin());

-- public.collections -- 5 role-based SELECT policies use get_user_organization_id
DROP POLICY IF EXISTS "Client users can view their collections" ON public.collections;
CREATE POLICY "Client users can view their collections"
  ON public.collections
  FOR SELECT
  USING (client_id = get_user_player_id());

DROP POLICY IF EXISTS "Edition studios can view assigned collections" ON public.collections;
CREATE POLICY "Edition studios can view assigned collections"
  ON public.collections
  FOR SELECT
  USING (retouch_studio_id = get_user_player_id());

DROP POLICY IF EXISTS "Hand print labs can view assigned collections" ON public.collections;
CREATE POLICY "Hand print labs can view assigned collections"
  ON public.collections
  FOR SELECT
  USING (handprint_lab_id = get_user_player_id());

DROP POLICY IF EXISTS "Labs can view assigned collections" ON public.collections;
CREATE POLICY "Labs can view assigned collections"
  ON public.collections
  FOR SELECT
  USING (photo_lab_id = get_user_player_id());

DROP POLICY IF EXISTS "Photographers can view assigned collections" ON public.collections;
CREATE POLICY "Photographers can view assigned collections"
  ON public.collections
  FOR SELECT
  USING (photographer_id = get_user_player_id());

-- public.collection_members -- 1 policy uses get_user_organization_id
DROP POLICY IF EXISTS "Users can view collection members" ON public.collection_members;
CREATE POLICY "Users can view collection members"
  ON public.collection_members
  FOR SELECT
  USING (
    (user_id = auth.uid())
    OR (
      EXISTS (
        SELECT 1
        FROM collections c
        WHERE c.id = collection_members.collection_id
          AND (
            c.client_id = get_user_player_id()
            OR c.photographer_id = get_user_player_id()
            OR c.photo_lab_id = get_user_player_id()
            OR c.retouch_studio_id = get_user_player_id()
            OR c.handprint_lab_id = get_user_player_id()
          )
      )
    )
  );

-- storage.objects -- 3 "Org admins ... own profile picture" policies
DROP POLICY IF EXISTS "Org admins can delete own profile picture" ON storage.objects;
CREATE POLICY "Org admins can delete own profile picture"
  ON storage.objects
  FOR DELETE
  USING (
    (bucket_id = 'profile-pictures'::text)
    AND is_org_admin()
    AND ((storage.foldername(name))[1] = (get_user_player_id())::text)
  );

DROP POLICY IF EXISTS "Org admins can update own profile picture" ON storage.objects;
CREATE POLICY "Org admins can update own profile picture"
  ON storage.objects
  FOR UPDATE
  USING (
    (bucket_id = 'profile-pictures'::text)
    AND is_org_admin()
    AND ((storage.foldername(name))[1] = (get_user_player_id())::text)
  );

DROP POLICY IF EXISTS "Org admins can upload own profile picture" ON storage.objects;
CREATE POLICY "Org admins can upload own profile picture"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    (bucket_id = 'profile-pictures'::text)
    AND is_org_admin()
    AND ((storage.foldername(name))[1] = (get_user_player_id())::text)
  );

-- ----------------------------------------------------------------------------
-- 6. Rebuild collection_events policies that referenced profiles.organization_id
--    directly (column was auto-renamed by Postgres, but we recreate the
--    policies so pg_get_expr emits the new name consistently and to make the
--    rename intent explicit in the migration history).
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "collection_events_select_collection_access" ON public.collection_events;
CREATE POLICY "collection_events_select_collection_access"
  ON public.collection_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_internal = true
    )
    OR EXISTS (
      SELECT 1 FROM collection_members cm
      WHERE cm.collection_id = collection_events.collection_id
        AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM collections c
      JOIN profiles p ON p.id = auth.uid()
      WHERE c.id = collection_events.collection_id
        AND (
          c.client_id = p.player_id
          OR c.photographer_id = p.player_id
          OR c.photo_lab_id = p.player_id
          OR c.retouch_studio_id = p.player_id
          OR c.handprint_lab_id = p.player_id
        )
    )
  );

DROP POLICY IF EXISTS "collection_events_update_collection_access" ON public.collection_events;
CREATE POLICY "collection_events_update_collection_access"
  ON public.collection_events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_internal = true
    )
    OR EXISTS (
      SELECT 1 FROM collection_members cm
      WHERE cm.collection_id = collection_events.collection_id
        AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM collections c
      JOIN profiles p ON p.id = auth.uid()
      WHERE c.id = collection_events.collection_id
        AND (
          c.client_id = p.player_id
          OR c.photographer_id = p.player_id
          OR c.photo_lab_id = p.player_id
          OR c.retouch_studio_id = p.player_id
          OR c.handprint_lab_id = p.player_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_internal = true
    )
    OR EXISTS (
      SELECT 1 FROM collection_members cm
      WHERE cm.collection_id = collection_events.collection_id
        AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM collections c
      JOIN profiles p ON p.id = auth.uid()
      WHERE c.id = collection_events.collection_id
        AND (
          c.client_id = p.player_id
          OR c.photographer_id = p.player_id
          OR c.photo_lab_id = p.player_id
          OR c.retouch_studio_id = p.player_id
          OR c.handprint_lab_id = p.player_id
        )
    )
  );

-- ----------------------------------------------------------------------------
-- 7. Drop old helper functions (now unreferenced)
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_user_organization_id();
DROP FUNCTION IF EXISTS public.user_belongs_to_org(uuid);

-- ----------------------------------------------------------------------------
-- 8. Rename indexes for consistency
-- ----------------------------------------------------------------------------

ALTER INDEX IF EXISTS public.organizations_pkey            RENAME TO players_pkey;
ALTER INDEX IF EXISTS public.idx_organizations_email       RENAME TO idx_players_email;
ALTER INDEX IF EXISTS public.idx_organizations_type        RENAME TO idx_players_type;
ALTER INDEX IF EXISTS public.organizations_name_unique_idx RENAME TO players_name_unique_idx;
ALTER INDEX IF EXISTS public.idx_invitations_organization  RENAME TO idx_invitations_player;
ALTER INDEX IF EXISTS public.idx_profiles_organization     RENAME TO idx_profiles_player;

-- ----------------------------------------------------------------------------
-- 9. Rename FK constraints
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_organization_id_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      RENAME CONSTRAINT profiles_organization_id_fkey TO profiles_player_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invitations_organization_id_fkey'
      AND conrelid = 'public.invitations'::regclass
  ) THEN
    ALTER TABLE public.invitations
      RENAME CONSTRAINT invitations_organization_id_fkey TO invitations_player_id_fkey;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 10. Rename trigger
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_organizations_updated_at'
      AND tgrelid = 'public.players'::regclass
  ) THEN
    ALTER TRIGGER update_organizations_updated_at
      ON public.players
      RENAME TO update_players_updated_at;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 11. Update comments
-- ----------------------------------------------------------------------------

COMMENT ON TABLE public.players IS
  'Unified table for all player types: clients, agencies, labs, studios';

COMMENT ON TABLE public.invitations IS
  'Pending invitations for users to join players';

COMMENT ON TYPE public.player_type IS
  'Player types: noba (production agency), client, photography_agency, self_photographer, photo_lab, retouch_studio, handprint_lab';
