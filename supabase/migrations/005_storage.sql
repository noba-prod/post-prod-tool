-- ============================================================================
-- Migration 005: Storage Policies
-- Description: Creates RLS policies for storage buckets
-- ============================================================================
-- 
-- IMPORTANT: Before running this migration, create the following buckets
-- via the Supabase Dashboard (Storage > New Bucket):
--
-- 1. "profile-pictures" bucket:
--    - Name: profile-pictures
--    - Public bucket: YES (checked)
--    - File size limit: 5MB
--    - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp, image/svg+xml
--
-- 2. "collection-assets" bucket:
--    - Name: collection-assets
--    - Public bucket: NO (unchecked)
--    - File size limit: 50MB
--    - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp, image/tiff, application/pdf
--
-- ============================================================================

-- ============================================================================
-- Storage Policies for Profile Pictures
-- ============================================================================

-- Anyone can view profile pictures (public bucket)
CREATE POLICY "Public read access for profile pictures"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-pictures');

-- Internal users can upload profile pictures
CREATE POLICY "Internal users can upload profile pictures"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures'
    AND public.is_internal_user()
  );

-- Internal users can update profile pictures
CREATE POLICY "Internal users can update profile pictures"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'profile-pictures'
    AND public.is_internal_user()
  );

-- Internal users can delete profile pictures
CREATE POLICY "Internal users can delete profile pictures"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'profile-pictures'
    AND public.is_internal_user()
  );

-- Org admins can upload their org's profile picture
-- File path should be: {organization_id}/logo.{ext}
CREATE POLICY "Org admins can upload own profile picture"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures'
    AND public.is_org_admin()
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  );

-- Org admins can update their org's profile picture
CREATE POLICY "Org admins can update own profile picture"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'profile-pictures'
    AND public.is_org_admin()
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  );

-- Org admins can delete their org's profile picture
CREATE POLICY "Org admins can delete own profile picture"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'profile-pictures'
    AND public.is_org_admin()
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  );

