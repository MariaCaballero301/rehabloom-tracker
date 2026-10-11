ALTER TABLE public.network_profiles ADD COLUMN IF NOT EXISTS finished_at timestamptz;
UPDATE public.network_profiles SET finished_at = updated_at WHERE finished_therapy AND finished_at IS NULL;
CREATE OR REPLACE FUNCTION public.set_network_profile_finished_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.finished_therapy AND (TG_OP = 'INSERT' OR NOT OLD.finished_therapy) THEN
    NEW.finished_at := now();
  ELSIF NOT NEW.finished_therapy THEN
    NEW.finished_at := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.finished_at := OLD.finished_at;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS network_profiles_finished_at ON public.network_profiles;
CREATE TRIGGER network_profiles_finished_at BEFORE INSERT OR UPDATE ON public.network_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_network_profile_finished_at();