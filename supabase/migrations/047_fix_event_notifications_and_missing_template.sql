-- ============================================================================
-- Migration 047: Fix event-processing flags and missing event template
-- ============================================================================

-- 1) Allow authenticated users to mark their own collection events as processed.
-- Without this UPDATE policy, notifications_processed stays false even when
-- notifications were generated.
CREATE POLICY "collection_events_update_collection_access" ON public.collection_events
  FOR UPDATE TO authenticated
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
  )
  WITH CHECK (
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

-- 2) Ensure photographer_selection_uploaded exists and is active.
INSERT INTO public.notification_templates (
  code,
  step,
  step_name,
  title,
  description,
  cta_text,
  cta_url_template,
  trigger_type,
  trigger_event,
  trigger_offset_minutes,
  trigger_condition,
  email_recipients,
  inapp_recipients,
  is_active
) VALUES (
  'photographer_selection_uploaded',
  4,
  'Photographer selection',
  'Selection uploaded and ready',
  'The photographer selection is ready. It is now available for the client to review.',
  'Review selection',
  '/collections/{collectionId}?step=photographer_selection',
  'on'::notification_trigger_type,
  'photographer_selection_uploaded',
  0,
  NULL,
  ARRAY['producer'::notification_recipient_type, 'client'::notification_recipient_type],
  ARRAY['producer'::notification_recipient_type, 'client'::notification_recipient_type],
  true
)
ON CONFLICT (code) DO UPDATE SET
  step = EXCLUDED.step,
  step_name = EXCLUDED.step_name,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  cta_text = EXCLUDED.cta_text,
  cta_url_template = EXCLUDED.cta_url_template,
  trigger_type = EXCLUDED.trigger_type,
  trigger_event = EXCLUDED.trigger_event,
  trigger_offset_minutes = EXCLUDED.trigger_offset_minutes,
  trigger_condition = EXCLUDED.trigger_condition,
  email_recipients = EXCLUDED.email_recipients,
  inapp_recipients = EXCLUDED.inapp_recipients,
  is_active = true,
  updated_at = now();
