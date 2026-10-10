CREATE FUNCTION public.reschedule_rehab_session(p_id uuid, p_starts_at timestamptz, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  s rehab_sessions;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Please sign in first.'; END IF;
  SELECT * INTO s FROM rehab_sessions
  WHERE id = p_id AND me IN (organizer_id, guest_id) AND status IN ('proposed', 'accepted')
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This session is no longer available.'; END IF;
  IF network_is_blocked(s.organizer_id, s.guest_id) THEN RAISE EXCEPTION 'This session is no longer available.'; END IF;
  IF p_starts_at < now() + interval '5 minutes' THEN RAISE EXCEPTION 'Pick a time in the future.'; END IF;
  IF p_starts_at > now() + interval '60 days' THEN RAISE EXCEPTION 'Pick a date within the next 60 days.'; END IF;
  IF p_starts_at = s.starts_at THEN RAISE EXCEPTION 'Pick a different time.'; END IF;
  UPDATE rehab_sessions SET
    starts_at = p_starts_at,
    status = 'proposed',
    note = CASE WHEN p_note IS NULL THEN note ELSE left(trim(p_note), 200) END,
    organizer_id = me,
    guest_id = CASE WHEN me = s.organizer_id THEN s.guest_id ELSE s.organizer_id END,
    organizer_name = CASE WHEN me = s.organizer_id THEN s.organizer_name ELSE s.guest_name END,
    guest_name = CASE WHEN me = s.organizer_id THEN s.guest_name ELSE s.organizer_name END
  WHERE id = p_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.reschedule_rehab_session(uuid, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_rehab_session(uuid, timestamptz, text) TO authenticated;