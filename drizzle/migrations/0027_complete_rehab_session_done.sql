ALTER TABLE public.rehab_sessions DROP CONSTRAINT IF EXISTS rehab_sessions_status_check;
ALTER TABLE public.rehab_sessions ADD CONSTRAINT rehab_sessions_status_check
  CHECK (status IN ('proposed', 'accepted', 'declined', 'cancelled', 'completed'));
ALTER TABLE public.rehab_sessions ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.rehab_sessions ADD COLUMN IF NOT EXISTS completed_by uuid;

CREATE OR REPLACE FUNCTION public.complete_rehab_session(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  s rehab_sessions;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Please sign in first.'; END IF;
  SELECT * INTO s FROM rehab_sessions
  WHERE id = p_id AND me IN (organizer_id, guest_id) AND status = 'accepted'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This session is no longer available.'; END IF;
  IF s.starts_at > now() + interval '15 minutes' THEN
    RAISE EXCEPTION 'You can mark it as done once the session starts.';
  END IF;
  UPDATE rehab_sessions SET status = 'completed', completed_at = now(), completed_by = me WHERE id = p_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.complete_rehab_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_rehab_session(uuid) TO authenticated;