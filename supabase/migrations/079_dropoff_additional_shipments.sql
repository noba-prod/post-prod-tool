-- Extra negative shipments (Analog HP/HR): informational for lab after primary dropoff_* columns.
ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS dropoff_additional_shipments jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.collections.dropoff_additional_shipments IS
  'Analog: supplemental shipments producer adds after pickup confirmation; JSON array of { managingShipping, provider, tracking }. Primary shipment remains dropoff_shipping_carrier / dropoff_shipping_tracking.';
