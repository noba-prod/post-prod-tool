-- ============================================================================
-- Migration 048: Fix notification recipients for highres_ready and client_selection_confirmed
-- ============================================================================
-- 1) highres_ready: Add client so they get notified when hand prints are ready to download.
--    Fixes: "El cliente no ha recibido notificacion de que las Hand Prints estaban listas"
-- 2) client_selection_confirmed: Add hand_print_lab so they know when client selection is ready.
--    Fixes: "El lab (hand print) no ha recibido notificacion de que la seleccion final estaba lista"

UPDATE public.notification_templates
SET
  email_recipients = ARRAY['photographer'::notification_recipient_type, 'producer'::notification_recipient_type, 'client'::notification_recipient_type],
  inapp_recipients = ARRAY['photographer'::notification_recipient_type, 'producer'::notification_recipient_type, 'client'::notification_recipient_type],
  updated_at = now()
WHERE code = 'highres_ready';

UPDATE public.notification_templates
SET
  email_recipients = ARRAY['hand_print_lab'::notification_recipient_type, 'photographer'::notification_recipient_type],
  inapp_recipients = ARRAY['hand_print_lab'::notification_recipient_type, 'photographer'::notification_recipient_type, 'producer'::notification_recipient_type],
  updated_at = now()
WHERE code = 'client_selection_confirmed';
