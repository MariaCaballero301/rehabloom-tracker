ALTER TABLE public.network_profiles ADD COLUMN share_exercise_counts boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.network_profiles.share_exercise_counts IS 'Opt-in sharing of aggregate completed exercise counts with connected, non-blocked accounts only.';

CREATE OR REPLACE FUNCTION public.buddy_relationship_stats(p_timezone text DEFAULT 'UTC')
RETURNS TABLE(user_id uuid, messages_sent bigint, cheer_xp bigint, message_days text[], shared_today bigint, shared_week bigint, shared_total bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  zone text;
  today date;
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  SELECT name INTO zone FROM pg_timezone_names WHERE name = p_timezone LIMIT 1;
  zone := COALESCE(zone, 'UTC');
  today := (now() AT TIME ZONE zone)::date;
  RETURN QUERY
  WITH connected AS (
    SELECT c.connected_user_id AS other_id FROM public.support_contacts c WHERE c.user_id = me AND c.connected_user_id IS NOT NULL
    UNION SELECT c.user_id FROM public.support_contacts c WHERE c.connected_user_id = me
  ), eligible AS (
    SELECT c.other_id FROM connected c WHERE c.other_id <> me AND NOT public.network_is_blocked(me, c.other_id)
  ), ranked_cheers AS (
    SELECT e.from_user, e.to_user, (e.created_at AT TIME ZONE zone)::date AS sent_day,
      row_number() OVER (PARTITION BY e.from_user, (e.created_at AT TIME ZONE zone)::date ORDER BY e.created_at, e.id) AS daily_rank
    FROM public.encouragements e WHERE e.from_user = me OR e.from_user IN (SELECT other_id FROM eligible)
  )
  SELECT b.other_id,
    (SELECT count(*) FROM ranked_cheers r WHERE r.from_user = me AND r.to_user = b.other_id),
    (SELECT count(*) * 2 FROM ranked_cheers r WHERE r.daily_rank <= 5 AND ((r.from_user = me AND r.to_user = b.other_id) OR (r.from_user = b.other_id AND r.to_user = me))),
    ARRAY(SELECT DISTINCT r.sent_day::text FROM ranked_cheers r WHERE ((r.from_user = me AND r.to_user = b.other_id) OR (r.from_user = b.other_id AND r.to_user = me)) AND r.sent_day <= today ORDER BY r.sent_day::text),
    CASE WHEN p.share_exercise_counts THEN (SELECT count(*) FROM public.completions c WHERE c.user_id = b.other_id AND c.status = 'complete' AND c.day = today) ELSE NULL END,
    CASE WHEN p.share_exercise_counts THEN (SELECT count(*) FROM public.completions c WHERE c.user_id = b.other_id AND c.status = 'complete' AND c.day BETWEEN today - extract(dow FROM today)::integer AND today) ELSE NULL END,
    CASE WHEN p.share_exercise_counts THEN (SELECT count(*) FROM public.completions c WHERE c.user_id = b.other_id AND c.status = 'complete' AND c.day <= today) ELSE NULL END
  FROM eligible b LEFT JOIN public.network_profiles p ON p.user_id = b.other_id;
END;
$$;
REVOKE ALL ON FUNCTION public.buddy_relationship_stats(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buddy_relationship_stats(text) TO authenticated, service_role;