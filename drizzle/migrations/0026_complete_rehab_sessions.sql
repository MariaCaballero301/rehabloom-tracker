ALTER TABLE public.rehab_sessions DROP CONSTRAINT rehab_sessions_status_check;
ALTER TABLE public.rehab_sessions ADD CONSTRAINT rehab_sessions_status_check CHECK (status IN ('proposed', 'accepted', 'declined', 'cancelled', 'completed'));

CREATE FUNCTION public.complete_rehab_session(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  s public.rehab_sessions%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Please sign in first.'; END IF;
  SELECT * INTO s FROM public.rehab_sessions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR me NOT IN (s.organizer_id, s.guest_id) THEN
    RAISE EXCEPTION 'Session not found.';
  END IF;
  IF s.status = 'completed' THEN RETURN; END IF;
  IF s.status <> 'accepted' OR s.starts_at > now() THEN
    RAISE EXCEPTION 'Only accepted sessions that have started can be finished.';
  END IF;
  UPDATE public.rehab_sessions SET status = 'completed' WHERE id = p_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.complete_rehab_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_rehab_session(uuid) TO authenticated;