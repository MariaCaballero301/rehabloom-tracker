ALTER TABLE public.invite_codes ALTER COLUMN expires_at SET DEFAULT 'infinity'::timestamptz;
UPDATE public.invite_codes SET expires_at = 'infinity' WHERE used_at IS NULL AND expires_at > now();

CREATE OR REPLACE FUNCTION public.create_invite_code(p_relationship text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  new_code text;
  i int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Please sign in first.'; END IF;
  IF p_relationship NOT IN ('family','friend') THEN RAISE EXCEPTION 'Unknown relationship.'; END IF;
  -- One permanent code per relationship: reuse it if it exists.
  SELECT code INTO new_code FROM invite_codes
  WHERE user_id = me AND relationship = p_relationship AND used_at IS NULL AND expires_at > now()
  ORDER BY created_at LIMIT 1;
  IF new_code IS NOT NULL THEN RETURN new_code; END IF;
  LOOP
    bytes := uuid_send(gen_random_uuid());
    new_code := '';
    FOR i IN 0..7 LOOP
      new_code := new_code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM invite_codes WHERE code = new_code);
  END LOOP;
  INSERT INTO invite_codes (user_id, code, relationship, expires_at) VALUES (me, new_code, p_relationship, 'infinity');
  RETURN new_code;
END $$;

CREATE OR REPLACE FUNCTION public.redeem_invite_code(p_code text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  inv invite_codes;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Please sign in first.'; END IF;
  SELECT * INTO inv FROM invite_codes
  WHERE code = upper(regexp_replace(COALESCE(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
    AND used_at IS NULL AND expires_at > now();
  IF NOT FOUND OR network_is_blocked(me, inv.user_id) THEN RAISE EXCEPTION 'That code is invalid or has expired.'; END IF;
  IF inv.user_id = me THEN RAISE EXCEPTION 'That''s your own code — share it with someone you trust.'; END IF;
  INSERT INTO support_contacts (user_id, connected_user_id, name, kind)
  VALUES (inv.user_id, me, network_display_name(me), inv.relationship)
  ON CONFLICT (user_id, connected_user_id) DO UPDATE SET kind = EXCLUDED.kind;
  -- Permanent codes stay usable; remember who used it last.
  UPDATE invite_codes SET used_by = me WHERE id = inv.id;
  RETURN network_display_name(inv.user_id);
END $function$;