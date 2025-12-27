-- ============================================================================
-- Migration 003: Collections Table
-- Description: Creates the collections table with all workflow fields
-- ============================================================================

-- Create collections table
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ==========================================================================
  -- Basic Information
  -- ==========================================================================
  
  -- Client relationship (required)
  client_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Collection details
  name TEXT NOT NULL,
  reference TEXT,
  
  -- Project deadline
  project_deadline DATE,
  project_deadline_time TEXT,
  
  -- ==========================================================================
  -- Configuration Options
  -- ==========================================================================
  
  -- Low-res to high-res options (checkboxes)
  low_res_to_high_res_digital BOOLEAN NOT NULL DEFAULT false,
  low_res_to_high_res_hand_print BOOLEAN NOT NULL DEFAULT false,
  
  -- Yes/No options
  photographer_request_edition BOOLEAN NOT NULL DEFAULT false,
  photographer_collaborates_with_agency BOOLEAN NOT NULL DEFAULT false,
  handprint_different_from_original_lab BOOLEAN NOT NULL DEFAULT false,
  
  -- ==========================================================================
  -- Entity Assignments
  -- ==========================================================================
  
  -- Photographer (can be photography_agency or self_photographer)
  photographer_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  
  -- Lab for low-res scans
  lab_low_res_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  
  -- Edition studio
  edition_studio_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  
  -- Hand print lab
  hand_print_lab_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  
  -- ==========================================================================
  -- Shooting Schedule
  -- ==========================================================================
  
  shooting_start_date DATE,
  shooting_start_time TEXT,
  shooting_end_date DATE,
  shooting_end_time TEXT,
  
  -- Shooting location
  shooting_street_address TEXT,
  shooting_zip_code TEXT,
  shooting_city TEXT,
  shooting_country TEXT,
  
  -- ==========================================================================
  -- Drop-off Shipping
  -- ==========================================================================
  
  dropoff_shipping_origin_address TEXT,
  dropoff_shipping_date DATE,
  dropoff_shipping_time TEXT,
  dropoff_shipping_destination_address TEXT,
  dropoff_delivery_date DATE,
  dropoff_delivery_time TEXT,
  dropoff_managing_shipping TEXT,
  dropoff_shipping_carrier TEXT,
  dropoff_shipping_tracking TEXT,
  
  -- ==========================================================================
  -- Low-Res Workflow
  -- ==========================================================================
  
  lowres_deadline_date DATE,
  lowres_deadline_time TEXT,
  lowres_shipping_origin_address TEXT,
  lowres_shipping_date DATE,
  lowres_shipping_time TEXT,
  lowres_shipping_destination_address TEXT,
  lowres_delivery_date DATE,
  lowres_delivery_time TEXT,
  lowres_managing_shipping TEXT,
  lowres_shipping_carrier TEXT,
  lowres_shipping_tracking TEXT,
  
  -- ==========================================================================
  -- Photo Selection
  -- ==========================================================================
  
  photo_selection_photographer_preselection_date DATE,
  photo_selection_photographer_preselection_time TEXT,
  photo_selection_client_selection_date DATE,
  photo_selection_client_selection_time TEXT,
  
  -- ==========================================================================
  -- Low to High Resolution Conversion
  -- ==========================================================================
  
  low_to_high_date DATE,
  low_to_high_time TEXT,
  
  -- ==========================================================================
  -- Pre-Check Phase
  -- ==========================================================================
  
  precheck_photographer_comments_date DATE,
  precheck_photographer_comments_time TEXT,
  precheck_studio_final_edits_date DATE,
  precheck_studio_final_edits_time TEXT,
  
  -- ==========================================================================
  -- Check Finals Phase
  -- ==========================================================================
  
  check_finals_photographer_check_date DATE,
  check_finals_photographer_check_time TEXT,
  
  -- ==========================================================================
  -- Timestamps
  -- ==========================================================================
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_collections_client ON public.collections(client_id);
CREATE INDEX idx_collections_photographer ON public.collections(photographer_id);
CREATE INDEX idx_collections_lab_low_res ON public.collections(lab_low_res_id);
CREATE INDEX idx_collections_edition_studio ON public.collections(edition_studio_id);
CREATE INDEX idx_collections_hand_print_lab ON public.collections(hand_print_lab_id);
CREATE INDEX idx_collections_project_deadline ON public.collections(project_deadline);

-- Apply the updated_at trigger
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Collection Members Junction Table
-- ============================================================================
-- Unified table linking collections to users with different roles
-- Roles match the workflow participants from each organization type

CREATE TYPE collection_member_role AS ENUM (
  'manager',          -- Client users who manage/approve the collection
  'photographer',     -- Users from photography_agency or self_photographer
  'lab_technician',   -- Users from lab_low_res_scan
  'editor',           -- Users from edition_studio
  'print_technician'  -- Users from hand_print_lab
);

CREATE TABLE IF NOT EXISTS public.collection_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role collection_member_role NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- A user can have multiple roles in the same collection (e.g., manager AND photographer)
  -- But cannot have the same role twice
  UNIQUE(collection_id, user_id, role)
);

-- Create indexes for efficient queries
CREATE INDEX idx_collection_members_collection ON public.collection_members(collection_id);
CREATE INDEX idx_collection_members_user ON public.collection_members(user_id);
CREATE INDEX idx_collection_members_role ON public.collection_members(role);
CREATE INDEX idx_collection_members_collection_role ON public.collection_members(collection_id, role);

-- Enable Row Level Security
ALTER TABLE public.collection_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Invitations Table
-- ============================================================================
-- For inviting users to organizations

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization the user is being invited to
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Invitation details
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Acceptance tracking
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_invitations_organization ON public.invitations(organization_id);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_status ON public.invitations(status);

-- Apply the updated_at trigger
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE public.collections IS 'Production collections with full workflow data';
COMMENT ON COLUMN public.collections.client_id IS 'The client (brand) this collection belongs to';
COMMENT ON COLUMN public.collections.photographer_id IS 'Assigned photographer organization (agency or self-photographer)';
COMMENT ON COLUMN public.collections.lab_low_res_id IS 'Assigned low-res scan lab';
COMMENT ON COLUMN public.collections.edition_studio_id IS 'Assigned edition studio';
COMMENT ON COLUMN public.collections.hand_print_lab_id IS 'Assigned hand print lab';

COMMENT ON TABLE public.collection_members IS 'Unified junction table linking collections to users with roles (manager, photographer)';
COMMENT ON TABLE public.invitations IS 'Pending invitations for users to join organizations';

