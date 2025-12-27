-- ============================================================================
-- Migration 002: Profiles Table
-- Description: Creates the profiles table extending Supabase auth.users
-- ============================================================================

-- Create enum for user roles within an organization
CREATE TYPE user_role AS ENUM (
  'admin',
  'editor',
  'viewer'
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  -- Primary key references Supabase auth.users
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Organization relationship (nullable for internal/production agency staff)
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  
  -- Personal info
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  
  -- Role within their organization
  -- For self_photographers, this is always 'admin'
  -- For internal staff (is_internal=true), this can be null
  role user_role,
  
  -- Internal staff flag (production agency employees)
  -- These users have super-admin permissions across all entities
  is_internal BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for organization lookups
CREATE INDEX idx_profiles_organization ON public.profiles(organization_id);

-- Create index for email lookups
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Create index for internal users
CREATE INDEX idx_profiles_internal ON public.profiles(is_internal) WHERE is_internal = true;

-- Apply the updated_at trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comments for documentation
COMMENT ON TABLE public.profiles IS 'Extended user profiles linked to Supabase auth.users';
COMMENT ON COLUMN public.profiles.organization_id IS 'Organization the user belongs to (null for internal staff)';
COMMENT ON COLUMN public.profiles.role IS 'User role within their organization';
COMMENT ON COLUMN public.profiles.is_internal IS 'True for production agency staff with super-admin permissions';

