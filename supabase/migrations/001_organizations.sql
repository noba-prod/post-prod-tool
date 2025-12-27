-- ============================================================================
-- Migration 001: Organizations Table
-- Description: Creates the unified organizations table for all entity types
-- ============================================================================

-- Create enum for organization types
CREATE TYPE organization_type AS ENUM (
  'client',
  'photography_agency',
  'self_photographer',
  'lab_low_res_scan',
  'edition_studio',
  'hand_print_lab'
);

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type discriminator
  type organization_type NOT NULL,
  
  -- Basic info (required for all types)
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  profile_picture_url TEXT,
  notes TEXT,
  
  -- Address info (required for: lab_low_res_scan, edition_studio, hand_print_lab)
  -- Nullable for: client, photography_agency, self_photographer
  street_address TEXT,
  zip_code TEXT,
  city TEXT,
  country TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups by type
CREATE INDEX idx_organizations_type ON public.organizations(type);

-- Create index for email lookups
CREATE INDEX idx_organizations_email ON public.organizations(email);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.organizations IS 'Unified table for all entity types: clients, agencies, labs, studios';
COMMENT ON COLUMN public.organizations.type IS 'Discriminator for entity type';
COMMENT ON COLUMN public.organizations.profile_picture_url IS 'URL to organization logo in storage bucket';
COMMENT ON COLUMN public.organizations.street_address IS 'Required for labs and studios, optional for others';

