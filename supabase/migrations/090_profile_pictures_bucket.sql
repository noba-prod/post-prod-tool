-- ============================================================================
-- Migration 090: Profile Pictures Bucket (public)
-- Description: Creates the profile-pictures storage bucket used for user avatars
--              and player logos. Migration 005 only added RLS policies and
--              assumed manual bucket creation in the dashboard.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/heic',
    'image/heif'
  ]
)
ON CONFLICT (id) DO NOTHING;
