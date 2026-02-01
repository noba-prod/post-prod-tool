-- ============================================================================
-- Migration 013: Profiles Image Column
-- Description: Adds image column to profiles for user profile picture URL
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN image TEXT;
COMMENT ON COLUMN public.profiles.image IS 'URL to user profile picture in profile-pictures storage bucket';
