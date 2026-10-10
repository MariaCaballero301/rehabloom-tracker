-- Sessions together between connected people (buddies, mentors, family/friends who joined),
-- the phone lookup for "Call" on home alerts, a demo trigger for alerts, and multi-area matching.
-- Every function checks auth.uid() itself; clients only read their own rows.

CREATE TABLE public.rehab_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL,
  guest_id uuid NOT NULL,
  organizer_name text NOT NULL DEFAULT '',
  guest_name text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  mode text NOT NULL CHECK (mode IN ('video', 'in_person')),
  place text NOT NULL DEFAULT '' CHECK (char_length(place) <= 120),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 200),
  -- Unguessable video room, only visible to the two people.
  meeting_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (organizer_id <> guest_id)
);
CREATE INDEX rehab_sessions_people_idx ON public.rehab_sessions (guest_id, organizer_id, starts_at);

GRANT SELECT ON public.rehab_sessions TO authenticated;
GRANT ALL ON public.rehab_sessions TO service_role;
ALTER TABLE public.rehab_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions i am part of" ON public.rehab_sessions FOR SELECT TO authenticated
  USING (auth.uid() IN (organizer_id, guest_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.rehab_sessions;

-- Internal: are these two people connected (either direction) and not blocked?
CREATE FUNCTION public.network_are_connected(a uuid, b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT network_is_blocked(a, b) AND EXISTS (
    SELECT 1 FROM support_contacts
    WHERE (user_id = a AND connected_user_id = b) OR (user_id = b AND connected_user_id = a));
$$;

CREATE FUNCTION public.propose_rehab_session(
  p_with uuid, p_starts_at timestamptz, p_mode text, p_place text DEFAULT '', p_note text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  new_id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Please sign in first.'; END IF;
  IF p_with = me OR NOT network_are_connected(me, p_with) THEN
    RAISE EXCEPTION 'You can only plan sessions with people in your network.';
  END IF;
  IF p_mode NOT IN ('video', 'in_person') THEN RAISE EXCEPTION 'Choose video call or in person.'; END IF;
  IF p_starts_at < now() + interval '5 minutes' THEN RAISE EXCEPTION 'Pick a time in the future.'; END IF;
  IF p_starts_at > now() + interval '60 days' THEN RAISE EXCEPTION 'Pick a date within the next 60 days.'; END IF;
  IF (SELECT count(*) FROM rehab_sessions WHERE organizer_id = me AND status = 'proposed') >= 10 THEN
    RAISE EXCEPTION 'You have 10 invites waiting for a reply already.';
  END IF;
  INSERT INTO rehab_sessions (organizer_id, guest_id, organizer_name, guest_name, starts_at, mode, place, note, meeting_url)
  VALUES (me, p_with, network_display_name(me), network_display_name(p_with), p_starts_at, p_mode,
          left(trim(COALESCE(p_place, '')), 120), left(trim(COALESCE(p_note, '')), 200),
          CASE WHEN p_mode = 'video'
               THEN 'https://meet.jit.si/Rehabloom-' || replace(gen_random_uuid()::text, '-', '')
               ELSE '' END)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE FUNCTION public.respond_rehab_session(p_id uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE rehab_sessions SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END
  WHERE id = p_id AND guest_id = auth.uid() AND status = 'proposed'
    AND NOT network_is_blocked(organizer_id, guest_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'This invite is no longer available.'; END IF;
END $$;

CREATE FUNCTION public.cancel_rehab_session(p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE rehab_sessions SET status = 'cancelled'
  WHERE id = p_id AND auth.uid() IN (organizer_id, guest_id) AND status IN ('proposed', 'accepted');
$$;

-- Phone of someone I support (for "Call" on home alerts). Only if they're in my network.
CREATE FUNCTION public.supported_person_phone(p_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT phone FROM support_profiles WHERE user_id = p_user), '')
  WHERE network_are_connected(auth.uid(), p_user);
$$;

-- Demo: pretend the signed-in patient missed 2 days, so their supporters get the home alert now.
CREATE FUNCTION public.simulate_missed_sessions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  c record;
  tok uuid;
  n integer := 0;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Please sign in first.'; END IF;
  IF (SELECT count(*) FROM support_notifications
      WHERE patient_id = me AND created_at > now() - interval '1 hour') >= 15 THEN
    RAISE EXCEPTION 'That''s enough demo alerts for this hour.';
  END IF;
  FOR c IN SELECT id, connected_user_id FROM support_contacts
           WHERE user_id = me AND connected_user_id IS NOT NULL AND notify_on_missed
             AND NOT network_is_blocked(me, connected_user_id) LOOP
    INSERT INTO alert_events (patient_id, contact_id, streak_start, missed_days, delivery_status)
    VALUES (me, c.id, current_date, 2, 'simulated')
    ON CONFLICT (patient_id, contact_id, streak_start) DO UPDATE SET missed_days = EXCLUDED.missed_days
    RETURNING token INTO tok;
    -- One open alert per supporter: replace any previous one still on their home screen.
    UPDATE support_notifications SET dismissed_at = now()
    WHERE recipient_id = c.connected_user_id AND patient_id = me AND dismissed_at IS NULL;
    INSERT INTO support_notifications (recipient_id, patient_id, patient_name, missed_days, support_token)
    VALUES (c.connected_user_id, me, network_display_name(me), 2, tok);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- Matching with several rehab areas: return rehab_areas too (falls back to the single area).
DROP FUNCTION public.network_directory();
CREATE FUNCTION public.network_directory()
RETURNS TABLE (user_id uuid, display_name text, rehab_area text, rehab_areas text[], languages text[],
               availability text[], discoverable boolean, is_mentor boolean, mentor_bio text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.display_name, p.rehab_area,
         CASE WHEN cardinality(p.rehab_areas) > 0 THEN p.rehab_areas ELSE ARRAY[p.rehab_area] END,
         p.languages, p.availability, p.discoverable, p.is_mentor, p.mentor_bio
  FROM network_profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.user_id <> auth.uid()
    AND p.display_name <> ''
    AND (p.discoverable OR p.is_mentor)
    AND NOT network_is_blocked(auth.uid(), p.user_id)
  ORDER BY p.created_at DESC
  LIMIT 500;
$$;

REVOKE EXECUTE ON FUNCTION public.network_are_connected(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.propose_rehab_session(uuid, timestamptz, text, text, text),
  public.respond_rehab_session(uuid, boolean), public.cancel_rehab_session(uuid),
  public.supported_person_phone(uuid), public.simulate_missed_sessions(), public.network_directory()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.propose_rehab_session(uuid, timestamptz, text, text, text),
  public.respond_rehab_session(uuid, boolean), public.cancel_rehab_session(uuid),
  public.supported_person_phone(uuid), public.simulate_missed_sessions(), public.network_directory()
  TO authenticated;
