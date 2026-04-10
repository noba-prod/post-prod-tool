-- Prevent accidental internal-user demotion.
-- Once is_internal is true, it must remain true.

CREATE OR REPLACE FUNCTION public.prevent_internal_profile_demotion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_internal = true AND NEW.is_internal = false THEN
    NEW.is_internal = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_internal_profile_demotion_trigger ON public.profiles;

CREATE TRIGGER prevent_internal_profile_demotion_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_internal_profile_demotion();
