-- ============================================================================
-- Migration 008: Add noba organization type
-- Description: Adds 'noba' to the organization_type enum for the production agency
-- ============================================================================

-- Add 'noba' to the organization_type enum
ALTER TYPE organization_type ADD VALUE IF NOT EXISTS 'noba';

-- Comment for documentation
COMMENT ON TYPE organization_type IS 'Organization types: noba (production agency), client, photography_agency, self_photographer, lab_low_res_scan, edition_studio, hand_print_lab';
