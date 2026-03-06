-- Add handprint_variant to distinguish Analog (HP) vs Analog (HR)
-- hp = Handprint different lab option available; hr = same photo_lab does conversions
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS handprint_variant TEXT;

COMMENT ON COLUMN public.collections.handprint_variant IS 'When low_res_to_high_res_hand_print=true: hp (Analog HP, handprint lab can differ) or hr (Analog HR, photo_lab does conversions). Null = legacy, treat as hp.';
