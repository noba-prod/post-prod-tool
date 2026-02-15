-- ============================================================================
-- Migration 033: Add missing collection event types
-- Description: Adds photographer_check_approved (step 6 – Photographer review)
--              and client_confirmation_confirmed (step 11 – Client confirmation)
--              to the collection_event_type enum.
-- ============================================================================

-- Add new event types to the existing enum
ALTER TYPE collection_event_type ADD VALUE IF NOT EXISTS 'photographer_check_approved';
ALTER TYPE collection_event_type ADD VALUE IF NOT EXISTS 'client_confirmation_confirmed';
