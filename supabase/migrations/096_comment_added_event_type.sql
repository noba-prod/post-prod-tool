-- Comment notifications insert collection_events with event_type 'comment_added'.
-- The value is referenced by the app types but was never added to the enum,
-- so the insert failed and comment notifications lost their dedupe key.
ALTER TYPE public.collection_event_type ADD VALUE IF NOT EXISTS 'comment_added';
