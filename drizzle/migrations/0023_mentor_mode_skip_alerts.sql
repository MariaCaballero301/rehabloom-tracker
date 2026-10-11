CREATE OR REPLACE FUNCTION public.simulate_missed_sessions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  c record;
  tok uuid;
  n integer := 0;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Please sign in first.'; END IF;
  -- Mentor mode: people who finished therapy never trigger missed-session alerts.
  IF EXISTS (SELECT 1 FROM network_profiles WHERE user_id = me AND finished_therapy) THEN
    RETURN 0;
  END IF;
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
    UPDATE support_notifications SET dismissed_at = now()
    WHERE recipient_id = c.connected_user_id AND patient_id = me AND dismissed_at IS NULL;
    INSERT INTO support_notifications (recipient_id, patient_id, patient_name, missed_days, support_token)
    VALUES (c.connected_user_id, me, network_display_name(me), 2, tok);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.simulate_missed_sessions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.simulate_missed_sessions() TO authenticated;