-- ============================================================================
-- Migration 049: Email Assets Bucket (public)
-- Description: Creates a public bucket for email assets (e.g. Logo.png) so
--              the logo URL is publicly accessible in invitation emails (Gmail, etc.)
-- ============================================================================
--
-- The bucket is created via SQL. If this fails (e.g. schema differences),
-- create manually in Supabase Dashboard: Storage > New Bucket
--   - Name: email-assets
--   - Public: YES
--   - File size limit: 5MB
--   - Allowed MIME types: image/png, image/jpeg, image/gif, image/webp
--
-- ============================================================================

-- Create the email-assets bucket (public, for logo and other email images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-assets',
  'email-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read: anyone can view (required for email clients to load the logo)
CREATE POLICY "Public read access for email assets"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'email-assets');

-- Internal users can upload
CREATE POLICY "Internal users can upload email assets"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'email-assets'
    AND public.is_internal_user()
  );

-- Internal users can update
CREATE POLICY "Internal users can update email assets"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'email-assets'
    AND public.is_internal_user()
  );

-- Internal users can delete
CREATE POLICY "Internal users can delete email assets"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'email-assets'
    AND public.is_internal_user()
  );
