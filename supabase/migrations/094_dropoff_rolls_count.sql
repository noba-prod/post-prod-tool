-- Migration 094: Number of rolls sent at pickup (Analog HP/HR)
--
-- The shooting pickup confirmation ("Confirm shipping details") now captures how
-- many film rolls are shipped to the lab. Stored on the collection for the primary
-- shipment; supplemental shipments carry their own `rolls` inside the
-- dropoff_additional_shipments jsonb entries.

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS dropoff_rolls_count integer;
