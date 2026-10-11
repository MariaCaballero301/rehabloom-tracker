CREATE OR REPLACE FUNCTION public.redeem_invite_code(p_code text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  inv invite_codes;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Please sign in first.'; END IF;
  SELECT * INTO inv FROM invite_codes
  WHERE code = upper(regexp_replace(COALESCE(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
    AND used_at IS NULL AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND OR network_is_blocked(me, inv.user_id) THEN RAISE EXCEPTION 'That code is invalid or has expired.'; END IF;
  IF inv.user_id = me THEN RAISE EXCEPTION 'That''s your own code — share it with someone you trust.'; END IF;
  INSERT INTO support_contacts (user_id, connected_user_id, name, kind)
  VALUES (inv.user_id, me, network_display_name(me), inv.relationship)
  ON CONFLICT (user_id, connected_user_id) DO UPDATE SET kind = EXCLUDED.kind;
  UPDATE invite_codes SET used_at = now(), used_by = me WHERE id = inv.id;
  RETURN network_display_name(inv.user_id);
END $function$;