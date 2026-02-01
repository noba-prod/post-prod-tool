-- ============================================================================
-- Migration 016: Notifications System
-- Description: Creates tables for notifications, templates, and collection events
-- ============================================================================

-- ============================================================================
-- ENUM Types
-- ============================================================================

-- Trigger types for notification templates
CREATE TYPE notification_trigger_type AS ENUM (
  'before',      -- Before a deadline (e.g., 30 minutes before shooting_end)
  'after',       -- After a deadline (e.g., 2 hours after dropoff_deadline)
  'on',          -- On an event (e.g., on:scanning_completed)
  'if',          -- Conditional check (e.g., if:negatives_not_confirmed)
  'first_time'   -- First occurrence (e.g., morning reminder)
);

-- Notification status
CREATE TYPE notification_status AS ENUM (
  'pending',     -- Scheduled but not yet sent
  'sent',        -- Successfully delivered
  'read',        -- User has read the notification
  'failed'       -- Failed to deliver
);

-- Notification delivery channel
CREATE TYPE notification_channel AS ENUM (
  'email',
  'in_app'
);

-- Recipient types (maps to organization/role types)
CREATE TYPE notification_recipient_type AS ENUM (
  'producer',
  'lab',
  'photographer',
  'client',
  'hand_print_lab',
  'edition_studio'
);

-- Collection event types (all possible workflow events)
CREATE TYPE collection_event_type AS ENUM (
  -- Shooting events
  'shooting_started',
  'shooting_ended',
  'negatives_pickup_marked',
  
  -- Drop-off events
  'dropoff_confirmed',
  'dropoff_deadline_missed',
  
  -- Scanning events
  'scanning_started',
  'scanning_completed',
  'scanning_deadline_missed',
  
  -- Photographer selection events
  'photographer_selection_uploaded',
  'photographer_selection_shared',
  'photographer_selection_deadline_missed',
  
  -- Client selection events
  'client_selection_started',
  'client_selection_confirmed',
  'client_selection_deadline_missed',
  
  -- High-res events
  'highres_started',
  'highres_ready',
  'highres_deadline_missed',
  
  -- Edition events
  'edition_request_submitted',
  'edition_request_deadline_missed',
  'final_edits_started',
  'final_edits_completed',
  'final_edits_deadline_missed',
  
  -- Photographer review events
  'photographer_review_started',
  'photographer_edits_approved',
  'photographer_review_deadline_missed',
  
  -- Final events
  'collection_completed',
  'collection_cancelled'
);

-- ============================================================================
-- Notification Templates Table
-- ============================================================================
-- Stores the 24 notification configurations from the CSV

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Unique identifier for the template (e.g., 'shooting_pickup_reminder')
  code TEXT UNIQUE NOT NULL,
  
  -- Workflow step (1-9)
  step INTEGER NOT NULL CHECK (step >= 1 AND step <= 9),
  
  -- Step name for display
  step_name TEXT NOT NULL,
  
  -- Notification content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  cta_text TEXT,
  cta_url_template TEXT, -- URL template with placeholders like {collectionId}
  
  -- Trigger configuration
  trigger_type notification_trigger_type NOT NULL,
  trigger_event TEXT NOT NULL, -- Event name or deadline field reference
  trigger_offset_minutes INTEGER DEFAULT 0, -- Positive for after, negative for before
  trigger_condition TEXT, -- Additional condition for 'if' triggers
  
  -- Recipients (arrays of recipient types)
  email_recipients notification_recipient_type[] NOT NULL DEFAULT '{}',
  inapp_recipients notification_recipient_type[] NOT NULL DEFAULT '{}',
  
  -- Whether this template is active
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_notification_templates_code ON public.notification_templates(code);
CREATE INDEX idx_notification_templates_step ON public.notification_templates(step);
CREATE INDEX idx_notification_templates_trigger_type ON public.notification_templates(trigger_type);
CREATE INDEX idx_notification_templates_trigger_event ON public.notification_templates(trigger_event);
CREATE INDEX idx_notification_templates_active ON public.notification_templates(is_active);

-- Apply the updated_at trigger
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Notifications Table
-- ============================================================================
-- Stores sent/pending notifications for users

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Delivery info
  channel notification_channel NOT NULL,
  status notification_status NOT NULL DEFAULT 'pending',
  
  -- Content (denormalized from template for history)
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  cta_text TEXT,
  cta_url TEXT,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ, -- When to send (null = immediate)
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Error tracking
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_notifications_collection ON public.notifications(collection_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_channel ON public.notifications(channel);
CREATE INDEX idx_notifications_scheduled ON public.notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE channel = 'in_app';
CREATE INDEX idx_notifications_user_channel_status ON public.notifications(user_id, channel, status);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Collection Events Table
-- ============================================================================
-- Tracks all workflow status changes for event-driven notifications

CREATE TABLE IF NOT EXISTS public.collection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  triggered_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Event info
  event_type collection_event_type NOT NULL,
  
  -- Additional data about the event
  metadata JSONB DEFAULT '{}',
  
  -- Whether notifications have been processed for this event
  notifications_processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_collection_events_collection ON public.collection_events(collection_id);
CREATE INDEX idx_collection_events_type ON public.collection_events(event_type);
CREATE INDEX idx_collection_events_user ON public.collection_events(triggered_by_user_id);
CREATE INDEX idx_collection_events_unprocessed ON public.collection_events(notifications_processed) 
  WHERE notifications_processed = false;
CREATE INDEX idx_collection_events_created ON public.collection_events(created_at);

-- Enable Row Level Security
ALTER TABLE public.collection_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Scheduled Notifications Table
-- ============================================================================
-- Tracks which time-based notifications have been scheduled to avoid duplicates

CREATE TABLE IF NOT EXISTS public.scheduled_notification_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.notification_templates(id) ON DELETE CASCADE,
  
  -- Tracking
  deadline_value TIMESTAMPTZ NOT NULL, -- The actual deadline being tracked
  scheduled_for TIMESTAMPTZ NOT NULL, -- When notification should fire
  
  -- Status
  is_sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  
  -- Prevent duplicate scheduling
  UNIQUE(collection_id, template_id, deadline_value),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_scheduled_tracking_pending ON public.scheduled_notification_tracking(scheduled_for) 
  WHERE is_sent = false;
CREATE INDEX idx_scheduled_tracking_collection ON public.scheduled_notification_tracking(collection_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Notification Templates: Read-only for all authenticated users
CREATE POLICY "notification_templates_read_all" ON public.notification_templates
  FOR SELECT TO authenticated
  USING (true);

-- Notifications: Users can only see their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Notifications: Users can update (mark as read) their own notifications
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Notifications: Service role can insert notifications for any user
CREATE POLICY "notifications_insert_service" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Collection Events: Internal users can insert events
CREATE POLICY "collection_events_insert_authenticated" ON public.collection_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Collection Events: Users can view events for collections they have access to
CREATE POLICY "collection_events_select_collection_access" ON public.collection_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_internal = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.collection_members cm
      WHERE cm.collection_id = collection_events.collection_id
        AND cm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.collections c
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = collection_events.collection_id
        AND (
          c.client_id = p.organization_id
          OR c.photographer_id = p.organization_id
          OR c.lab_low_res_id = p.organization_id
          OR c.edition_studio_id = p.organization_id
          OR c.hand_print_lab_id = p.organization_id
        )
    )
  );

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE public.notification_templates IS 'Stores the 24 notification type configurations for workflow automation';
COMMENT ON TABLE public.notifications IS 'Individual notification instances sent to users via email or in-app';
COMMENT ON TABLE public.collection_events IS 'Tracks workflow status changes that trigger event-based notifications';
COMMENT ON TABLE public.scheduled_notification_tracking IS 'Prevents duplicate scheduling of time-based notifications';

COMMENT ON COLUMN public.notification_templates.trigger_type IS 'Type of trigger: before/after deadline, on event, conditional check';
COMMENT ON COLUMN public.notification_templates.trigger_event IS 'Reference to deadline field or event type';
COMMENT ON COLUMN public.notification_templates.trigger_offset_minutes IS 'Minutes offset from trigger (negative=before, positive=after)';
COMMENT ON COLUMN public.notification_templates.cta_url_template IS 'URL template with {collectionId} placeholder';

COMMENT ON COLUMN public.notifications.scheduled_for IS 'When to send - null means immediate';
COMMENT ON COLUMN public.collection_events.notifications_processed IS 'Whether event-triggered notifications have been sent';
